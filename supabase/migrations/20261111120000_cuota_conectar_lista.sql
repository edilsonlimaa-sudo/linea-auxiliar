-- R76: sin la cuota del día, el chofer tampoco se conecta ni ve la lista hacia Valle Grande (ni nombres ni teléfonos).
-- Un chofer que no pagó y buscaba a la gente de la lista preguntando "¿estás en la lista?" parecía de la línea.
-- Quien tiene un viaje abierto (p. ej., le rechazaron el pago a media jornada) sigue viéndola para terminarlo.

create function public._trabaja_hoy(p_chofer uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select public._dia_habilitado(p_chofer)
      or exists (select 1 from public.viajes where chofer_id = p_chofer and estado not in ('finalizado', 'cancelado'))
$$;
revoke execute on function public._trabaja_hoy(uuid) from anon, public, authenticated;

create or replace function public.conectar()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public._exigir_chofer();
  if not public._trabaja_hoy(auth.uid()) then
    raise exception 'Para conectarte hoy, paga la cuota del día y avisa la referencia del Pago Móvil';
  end if;
  update public.perfiles set conectado_en = now() where id = auth.uid();
end;
$function$;

create or replace function public.lista_para_choferes()
 RETURNS TABLE(id uuid, posicion integer, nombre text, foto_path text, personas integer, en_gina boolean, lugar text, creada_en timestamp with time zone, telefono text, lat double precision, lng double precision, dice_que_subio boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_conectado boolean;
begin
  perform public._exigir_chofer();
  -- Sin la cuota del día (y sin viaje abierto), la lista no es para él
  if not public._trabaja_hoy(auth.uid()) then return; end if;
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
$function$;

create or replace function public.lista_de_gina()
 RETURNS TABLE(id uuid, posicion integer, nombre text, foto_path text, personas integer, en_gina boolean, lugar text, creada_en timestamp with time zone, vence_en timestamp with time zone, es_mio boolean, dice_que_subio boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select l.id, (row_number() over (order by l.creada_en, l.id))::int, public.nombre_corto(pf.nombre), pf.foto_path,
         l.personas, l.en_gina, l.lugar, l.creada_en, l.vence_en, l.pasajero_id = auth.uid(), l.dice_que_subio is not null
    from public.lista_gina l join public.perfiles pf on pf.id = l.pasajero_id
   where auth.uid() is not null and l.estado = 'esperando'
     -- Un chofer sin la cuota del día (y sin viaje abierto) no ve quién espera
     and (not public.es_chofer() or public._trabaja_hoy(auth.uid())) and l.vence_en > now()
   order by l.creada_en, l.id;
$function$;
