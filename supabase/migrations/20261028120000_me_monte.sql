-- R62: "Me monté en un carro de la línea". Montarse no es "Me fui" (lo marca el chofer con Subió), pero hubo quien
-- tocó "Me fui" al montarse. Esta opción no saca de la lista: deja a la persona marcada para que el chofer la vea
-- destacada y la marque Subió, aunque ya haya salido de Gina o no le tocara en el plan (si cabe).

alter table public.lista_gina add column dice_que_subio timestamptz;

create function public.me_monte()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.lista_gina set dice_que_subio = now(), vence_en = greatest(vence_en, now() + interval '30 minutes')
   where pasajero_id = auth.uid() and estado = 'esperando' and vence_en > now();
  if not found then raise exception 'Ya no estás en la lista'; end if;
end;
$$;

-- Las dos lecturas de la lista dicen quién avisó que ya se montó
drop function public.lista_de_gina();
create function public.lista_de_gina()
returns table (id uuid, posicion int, nombre text, foto_path text, personas int, en_gina boolean, lugar text,
               creada_en timestamptz, vence_en timestamptz, es_mio boolean, dice_que_subio boolean)
language sql stable security definer set search_path = '' as $$
  select l.id, (row_number() over (order by l.creada_en, l.id))::int, public.nombre_corto(pf.nombre), pf.foto_path,
         l.personas, l.en_gina, l.lugar, l.creada_en, l.vence_en, l.pasajero_id = auth.uid(), l.dice_que_subio is not null
    from public.lista_gina l join public.perfiles pf on pf.id = l.pasajero_id
   where auth.uid() is not null and l.estado = 'esperando' and l.vence_en > now()
   order by l.creada_en, l.id;
$$;

drop function public.lista_para_choferes();
create function public.lista_para_choferes()
returns table (id uuid, posicion int, nombre text, foto_path text, personas int, en_gina boolean, lugar text,
               creada_en timestamptz, telefono text, lat double precision, lng double precision, dice_que_subio boolean)
language plpgsql stable security definer set search_path = '' as $$
declare v_conectado boolean;
begin
  perform public._exigir_chofer();
  select pf.conectado_en is not null into v_conectado from public.perfiles pf where pf.id = auth.uid();
  return query
    select l.id, (row_number() over (order by l.creada_en, l.id))::int, public.nombre_corto(pf.nombre), pf.foto_path,
           l.personas, l.en_gina, l.lugar, l.creada_en, case when v_conectado then pp.telefono end, lp.lat, lp.lng,
           l.dice_que_subio is not null
      from public.lista_gina l
      join public.perfiles pf on pf.id = l.pasajero_id
      left join public.perfiles_privados pp on pp.id = l.pasajero_id
      left join public.lista_gina_privado lp on lp.id = l.id
     where l.estado = 'esperando' and l.vence_en > now()
     order by l.creada_en, l.id;
end;
$$;

-- "Subió" (R64, R67): igual que antes, y quien dice que ya se montó se marca aunque el carro ya haya salido de
-- Gina o no le tocara en el plan, si cabe
create or replace function public.subio_de_lista(p_entrada uuid, p_viaje uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.viajes;
  e public.lista_gina;
  v_cabe boolean;
  v_reserva uuid;
  v_lat double precision;
  v_lng double precision;
begin
  perform public._exigir_chofer();
  perform 1 from public.viajes where id = p_viaje for update; -- un "Subió" a la vez por carro
  v := public._mi_viaje(p_viaje);
  if v.sentido <> 'centro_a_vg' then raise exception 'La lista de Gina es solo para Centro → Valle Grande'; end if;
  select * into e from public.lista_gina where id = p_entrada for update;
  if e.id is null or e.estado <> 'esperando' or e.vence_en <= now() then raise exception 'Esa persona ya no está en la lista'; end if;

  if v.estado not in ('en_parada', 'en_ruta') then
    raise exception 'Marca "Ya llegué" a Gina antes de subir a alguien';
  elsif e.dice_que_subio is not null then
    if v.puestos - v.ocupados < e.personas then raise exception 'Vas lleno'; end if;
  elsif v.estado = 'en_parada' then
    select pl.cabe into v_cabe from public._plan_gina(v.id, public._ocupado_por_otros(v.id)) pl where pl.entrada_id = e.id;
    if not coalesce(v_cabe, false) then
      raise exception '%', case when e.personas > 1 then 'No caben todos: el grupo espera el siguiente carro'
                                else 'No hay puesto: los que quedan están guardados para gente del camino' end;
    end if;
  else
    if e.en_gina then raise exception 'Ya saliste de Gina'; end if;
    if v.puestos - v.ocupados < e.personas then raise exception 'Vas lleno'; end if;
  end if;

  select lp.lat, lp.lng into v_lat, v_lng from public.lista_gina_privado lp where lp.id = e.id;
  insert into public.reservas (viaje_id, pasajero_id, lugar, lat, lng, personas, estado, listo, en_camino, aceptada_en)
  values (v.id, e.pasajero_id, coalesce(e.lugar, 'Gina'), v_lat, v_lng, e.personas, 'subio', true, v.estado = 'en_ruta', now())
  returning id into v_reserva;
  update public.lista_gina set estado = 'subio', viaje_id = v.id, reserva_id = v_reserva, cerrada_en = now() where id = e.id;
  return v_reserva;
end;
$$;

revoke execute on function public.me_monte() from anon, public;
revoke execute on function public.lista_de_gina() from anon, public;
revoke execute on function public.lista_para_choferes() from anon, public;
grant execute on function public.me_monte() to authenticated;
grant execute on function public.lista_de_gina() to authenticated;
grant execute on function public.lista_para_choferes() to authenticated;
