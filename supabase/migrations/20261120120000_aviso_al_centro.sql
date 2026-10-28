-- §5.8 R94: "Avísame cuando haya un carro al Centro" (interfaz nueva). Reusa las esperas de R31 sin pedir el lugar:
-- la persona escoge hasta cuándo vale; el primer viaje al Centro que se publica mientras vale le avisa una sola vez.
-- El aviso lo manda el servidor justo después de que el chofer publica (con su sesión), como el de cuenta nueva (R93).

alter table public.esperas
  add column vence_en    timestamptz,          -- R94: hasta cuándo vale el pedido de aviso (null = las 2 h de siempre)
  add column avisado_en  timestamptz,          -- R94: ya se le avisó (una sola vez)
  add column avisado_por uuid references public.viajes (id) on delete set null;

-- Un pedido de aviso no tiene lugar: alcanza con que tenga hasta cuándo vale
alter table public.esperas drop constraint espera_donde;
alter table public.esperas add constraint espera_donde check (lugar is not null or lat is not null or vence_en is not null);

-- R31 sigue apagado: nadie más que el admin ve quién espera (ni nombre ni teléfono ni lugar)
revoke execute on function public.esperando_para_choferes() from authenticated;
revoke execute on function public.esperan_conmigo() from authenticated;

-- Pedir el aviso (R94): reemplaza el pedido anterior. Entre 15 min y 12 h
create function public.pedir_aviso(p_sentido public.sentido, p_hasta timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._exigir_pasajero();
  if p_sentido is distinct from 'vg_a_centro' then raise exception 'Por ahora el aviso es solo para ir al Centro'; end if;
  if p_hasta is null or p_hasta < now() + interval '14 minutes' or p_hasta > now() + interval '12 hours' then
    raise exception 'Escoge hasta cuándo te avisamos (entre 15 minutos y 12 horas)';
  end if;
  if exists (select 1 from public.reservas where pasajero_id = auth.uid() and estado = 'activa') then
    raise exception 'Ya tienes puesto en un carro';
  end if;
  perform public._cerrar_espera(auth.uid(), 'cancelada');
  insert into public.esperas (pasajero_id, sentido, vence_en) values (auth.uid(), p_sentido, p_hasta) returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.pedir_aviso(public.sentido, timestamptz) from anon, public;
grant execute on function public.pedir_aviso(public.sentido, timestamptz) to authenticated;

-- Las esperas vencen a su hora (R94) o a las 2 h (R35)
create or replace function public.vencer_esperas()
returns void language sql security definer set search_path = '' as $$
  update public.esperas set estado = 'expirada', cerrada_en = now()
   where estado = 'esperando' and coalesce(vence_en, creado_en + interval '2 hours') < now();
$$;
revoke execute on function public.vencer_esperas() from anon, public, authenticated;

-- R94: el chofer acaba de publicar; los pedidos que su viaje cumple quedan avisados (una sola vez) y el servidor recibe
-- los aparatos a los que mandar el aviso. Solo los viajes del que llama, abiertos y publicados hace menos de 5 min.
create function public.avisar_esperas()
returns table (viaje_id uuid, endpoint text, p256dh text, auth text) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v public.viajes;
  v_prueba boolean := public._es_prueba(auth.uid());
begin
  perform public._exigir_chofer();
  for v in
    select * from public.viajes
     where chofer_id = auth.uid() and sentido = 'vg_a_centro' and creado_en > now() - interval '5 minutes'
     order by creado_en
  loop
    if not public._acepta_reservas(v) then continue; end if;
    return query
    with avisadas as (
      update public.esperas e set avisado_en = now(), avisado_por = v.id
       where e.estado = 'esperando' and e.sentido = v.sentido and e.avisado_en is null and e.vence_en is not null
         and e.vence_en > now()
         -- Cuándo llega a recoger: la hora fija si quedó en cadena; si no, lo que dijo al publicar. En cadena sin hora, avisa
         and coalesce(v.hora_fija, case when v.estado <> 'programado' then v.estado_en + make_interval(mins => v.eta_min) end,
                      e.vence_en) <= e.vence_en
         and e.pasajero_id <> auth.uid()
         and (not v_prueba or public._es_prueba(e.pasajero_id)) -- R91: el chofer de prueba solo avisa a cuentas de prueba
      returning e.pasajero_id
    )
    select v.id, s.endpoint, s.p256dh, s.auth from public.push_suscripciones s join avisadas a on a.pasajero_id = s.persona_id;
  end loop;
end;
$$;
revoke execute on function public.avisar_esperas() from anon, public;
grant execute on function public.avisar_esperas() to authenticated;
