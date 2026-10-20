-- =====================================================================================
-- R58: el chofer confirma cada reserva. Los puestos quedan guardados al apartar (pendiente) y, sin respuesta en
-- 5 minutos (o si sale con el viaje sin responder), la reserva se rechaza sola.
-- R31: los choferes conectados ven quién espera (nombre corto, foto, lugar, desde cuándo y teléfono para WhatsApp).
-- =====================================================================================

-- ---------- Toda reserva del pasajero nace pendiente (R58) ----------
create or replace function public.reservar(
  p_viaje uuid,
  p_lugar text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_personas int default 1
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.viajes;
  v_en_ruta boolean;
  v_libres int;
  v_id uuid;
begin
  perform public._exigir_pasajero();
  if p_personas is null or p_personas not between 1 and 4 then
    raise exception 'Pueden viajar de 1 a 4 personas por reserva';
  end if;
  select * into v from public.viajes where id = p_viaje for update;
  if v.id is null then raise exception 'Ese viaje no existe'; end if;
  if not public._acepta_reservas(v) then
    raise exception '%', case when v.estado = 'en_ruta' then 'Ese carro ya va lleno' else 'Este viaje ya no acepta reservas' end;
  end if;
  perform public._validar_lugar(p_lugar, p_lat, p_lng);

  v_en_ruta := v.estado = 'en_ruta';
  perform public._cerrar_reserva_activa(auth.uid());   -- un solo lugar activo (R18)
  perform public._cerrar_espera(auth.uid(), 'reservo');

  select puestos - ocupados into v_libres from public.viajes where id = v.id;
  -- El grupo viaja junto: puestos para todos o nada (R57). En el camino, también (R28)
  if (p_personas > 1 or v_en_ruta) and v_libres < p_personas then
    raise exception '%', case
      when v_libres <= 0 then 'Ese carro ya va lleno'
      when v_libres = 1 then format('Solo queda 1 puesto para %s personas', p_personas)
      else format('Solo quedan %s puestos para %s personas', v_libres, p_personas) end;
  end if;

  -- Pendiente hasta que el chofer confirme; los puestos ya quedan guardados (R58)
  insert into public.reservas (viaje_id, pasajero_id, lugar, lat, lng, en_camino, pendiente, personas)
  values (v.id, auth.uid(), nullif(trim(coalesce(p_lugar, '')), ''), p_lat, p_lng, v_en_ruta, true, p_personas)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- El chofer acepta o rechaza, en cualquier momento del viaje abierto (R29, R58) ----------
create or replace function public.responder_pedido(p_reserva uuid, p_acepta boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reservas; v public.viajes;
begin
  perform public._exigir_chofer();
  r := public._reserva(p_reserva);
  v := public._mi_viaje(r.viaje_id);
  if v.estado not in ('programado', 'en_camino', 'llegando', 'en_parada', 'en_ruta') or r.estado <> 'activa' or not r.pendiente then
    raise exception 'Ese pedido ya no está pendiente';
  end if;
  if p_acepta and r.creado_en < now() - interval '5 minutes' then
    raise exception 'Pasaron 5 minutos: ese pedido se rechazó solo';
  end if;
  if p_acepta then
    update public.reservas set pendiente = false, aceptada_en = now() where id = r.id;
  else
    update public.reservas set estado = 'rechazada', pendiente = false, cerrada_en = now() where id = r.id;
  end if;
end;
$$;

-- ---------- "No vino": primero hay que responder el pedido (R58) ----------
create or replace function public.marcar_no_vino(p_reserva uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reservas; v public.viajes;
begin
  perform public._exigir_chofer();
  r := public._reserva(p_reserva);
  v := public._mi_viaje(r.viaje_id);
  if r.estado <> 'activa' then raise exception 'Esa reserva ya está cerrada'; end if;
  if r.pendiente then raise exception 'Primero responde el pedido'; end if;
  if v.estado in ('en_camino', 'llegando', 'en_parada') then
    if public.posicion_reserva(r.id) > v.puestos then raise exception 'Esa persona está en lista de espera, no tiene puesto'; end if;
  elsif v.estado <> 'en_ruta' then
    raise exception 'Todavía no puedes marcar "No vino" en este viaje';
  end if;
  update public.reservas set estado = 'no_llego', cerrada_en = now() where id = r.id;
end;
$$;

-- ---------- Al salir: lo no respondido se rechaza; después suben los que caben (R14, R57, R58) ----------
create or replace function public.avanzar_viaje(p_viaje uuid, p_estado public.estado_viaje)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.viajes;
  r record;
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);

  if not (
       (v.estado = 'en_camino' and p_estado in ('llegando', 'en_parada'))
    or (v.estado = 'llegando'  and p_estado = 'en_parada')
    or (v.estado = 'en_parada' and p_estado = 'en_ruta')
    or (v.estado = 'en_ruta'   and p_estado = 'finalizado')
  ) then
    raise exception 'No se puede pasar de % a %', v.estado, p_estado;
  end if;

  if p_estado = 'en_parada' then
    -- Llegó a la recogida: el viaje anterior que iba en ruta se cierra solo (R13)
    for r in select id from public.viajes
              where chofer_id = auth.uid() and estado = 'en_ruta' and id <> v.id
    loop
      perform public._cerrar_pedidos(r.id);
      update public.viajes set estado = 'finalizado', estado_en = now(), llegada_en = now() where id = r.id;
    end loop;
  end if;

  if p_estado = 'en_ruta' then
    -- Sale sin haber respondido: esas solicitudes se rechazan (R58)
    update public.reservas set estado = 'rechazada', pendiente = false, cerrada_en = now()
     where viaje_id = v.id and estado = 'activa' and pendiente;
    -- Suben los que tienen puesto (su "hasta" cabe); la lista de espera queda sin puesto (R14, R57)
    update public.reservas res
       set estado = case when t.hasta <= v.puestos then 'subio'::public.estado_reserva
                         else 'sin_puesto'::public.estado_reserva end,
           cerrada_en = case when t.hasta <= v.puestos then null else now() end
      from (select id, sum(personas) over (order by creado_en, id) as hasta
              from public.reservas where viaje_id = v.id and estado = 'activa') t
     where res.id = t.id;
    update public.viajes set salida_en = now() where id = v.id;
  end if;

  if p_estado = 'finalizado' then
    perform public._cerrar_pedidos(v.id);
    update public.viajes set llegada_en = now() where id = v.id;
  end if;

  update public.viajes set estado = p_estado, estado_en = now() where id = v.id;

  if p_estado in ('en_ruta', 'finalizado') then
    perform public._promover(auth.uid());
  end if;
end;
$$;

-- ---------- Sin respuesta en 5 minutos, se rechaza sola (R58) ----------
create function public.vencer_pedidos()
returns void language sql security definer set search_path = '' as $$
  update public.reservas set estado = 'rechazada', pendiente = false, cerrada_en = now()
   where estado = 'activa' and pendiente and creado_en < now() - interval '5 minutes';
$$;
revoke execute on function public.vencer_pedidos() from anon, public, authenticated;
select cron.schedule('vencer-pedidos', '* * * * *', $$select public.vencer_pedidos()$$);

-- ---------- Quién espera, para los choferes conectados (R31, §6) ----------
create function public.esperando_para_choferes()
returns table (
  id          uuid,
  nombre      text,
  foto_path   text,
  sentido     public.sentido,
  personas    int,
  lugar       text,
  lat         double precision,
  lng         double precision,
  creado_en   timestamptz,
  telefono    text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_chofer() then raise exception 'Solo para choferes'; end if;
  -- Solo mientras trabaja: el chofer desconectado no ve a nadie
  if not exists (select 1 from public.perfiles pf where pf.id = auth.uid() and pf.conectado_en is not null) then return; end if;
  return query
    select e.id, public.nombre_corto(p.nombre), p.foto_path, e.sentido, e.personas, e.lugar, e.lat, e.lng, e.creado_en, pp.telefono
      from public.esperas e
      join public.perfiles p on p.id = e.pasajero_id
      left join public.perfiles_privados pp on pp.id = e.pasajero_id
     where e.estado = 'esperando' and e.creado_en > now() - interval '2 hours'
     order by e.creado_en;
end;
$$;
revoke execute on function public.esperando_para_choferes() from anon, public;
grant execute on function public.esperando_para_choferes() to authenticated;
