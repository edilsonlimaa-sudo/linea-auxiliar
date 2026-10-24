-- R36: al anotar a mano a quien no usa la app, lo que importa es dónde recogerlo y cuántos van; el nombre es opcional.
-- Igual que antes en lo demás (R37: solo si caben, R59).

drop function public.ocupar_puesto(uuid, text);
create function public.ocupar_puesto(p_viaje uuid, p_nombre text default null, p_lugar text default null, p_personas int default 1)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.viajes;
  v_id uuid;
  v_nombre text := coalesce(nullif(trim(coalesce(p_nombre, '')), ''), 'Pasajero sin app');
  v_lugar text := nullif(trim(coalesce(p_lugar, '')), '');
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);
  if v.estado not in ('programado', 'en_camino', 'llegando', 'en_parada', 'en_ruta') then
    raise exception 'Ese viaje ya está cerrado';
  end if;
  if p_personas is null or p_personas < 1 or p_personas > 4 then raise exception 'Escoge cuántos van (de 1 a 4)'; end if;
  if char_length(v_nombre) > 40 then raise exception 'Escribe el nombre más corto'; end if;
  if char_length(v_lugar) > 60 then raise exception 'Escribe el lugar más corto (máximo 60 letras)'; end if;
  if v.ocupados >= v.puestos then raise exception 'Vas lleno. Si alguien se bajó, márcalo primero o sube los puestos'; end if;
  if v.ocupados + p_personas > v.puestos then
    raise exception 'No caben %: te quedan % puestos', p_personas, v.puestos - v.ocupados;
  end if;
  if v.estado = 'en_ruta' then
    insert into public.reservas (viaje_id, nombre, lugar, personas, estado, listo, en_camino)
    values (v.id, v_nombre, v_lugar, p_personas, 'subio', true, true)
    returning id into v_id;
  else
    insert into public.reservas (viaje_id, nombre, lugar, personas, listo)
    values (v.id, v_nombre, v_lugar, p_personas, true)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.ocupar_puesto(uuid, text, text, int) from anon, public;
grant execute on function public.ocupar_puesto(uuid, text, text, int) to authenticated;
