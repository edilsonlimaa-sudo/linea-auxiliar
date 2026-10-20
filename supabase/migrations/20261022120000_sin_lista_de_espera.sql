-- =====================================================================================
-- R59: sin lista de espera. Un carro lleno no acepta más reservas (ni anotados a mano), y el chofer no baja los
-- puestos por debajo de los que ya tienen reserva. Quien no consigue puesto pide "Avísame" (R31).
-- =====================================================================================

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
  -- Puestos para todos o nada: no hay lista de espera (R59); el grupo viaja junto (R57)
  if v_libres < p_personas then
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

-- "Ocupar puesto" (R36–R37): solo con un puesto libre, antes de salir o en ruta
create or replace function public.ocupar_puesto(p_viaje uuid, p_nombre text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.viajes; v_id uuid;
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);
  if v.estado not in ('programado', 'en_camino', 'llegando', 'en_parada', 'en_ruta') then
    raise exception 'Ese viaje ya está cerrado';
  end if;
  if v.ocupados >= v.puestos then raise exception 'Vas lleno. Si alguien se bajó, márcalo primero o sube los puestos'; end if;
  if v.estado = 'en_ruta' then
    insert into public.reservas (viaje_id, nombre, estado, listo, en_camino)
    values (v.id, coalesce(nullif(trim(coalesce(p_nombre, '')), ''), 'Pasajero sin app'), 'subio', true, true)
    returning id into v_id;
  else
    insert into public.reservas (viaje_id, nombre, listo)
    values (v.id, coalesce(nullif(trim(coalesce(p_nombre, '')), ''), 'Pasajero sin app'), true)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- No se bajan los puestos por debajo de los ya reservados: nadie queda sin puesto (R59)
create or replace function public.cambiar_puestos(p_viaje uuid, p_puestos int)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.viajes;
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);
  if v.estado in ('finalizado', 'cancelado') then raise exception 'Ese viaje ya está cerrado'; end if;
  if p_puestos is null or p_puestos not between 1 and 8 then raise exception 'Los puestos deben estar entre 1 y 8'; end if;
  if p_puestos < v.ocupados then
    raise exception 'Tienes % pasajeros con puesto: no puedes bajar a % puestos', v.ocupados, p_puestos;
  end if;
  update public.viajes set puestos = p_puestos where id = v.id;
end;
$$;
