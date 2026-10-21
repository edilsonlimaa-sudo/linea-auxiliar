-- =====================================================================================
-- R58 eliminada: apartar ya no espera la confirmación del chofer; el puesto queda garantizado al instante.
-- Solo el pedido en el camino (R29) sigue pendiente hasta que el chofer responde, sin vencimiento automático.
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

  -- Al apartar, el puesto queda garantizado (R58 eliminada). En ruta es un pedido: el chofer decide (R29)
  insert into public.reservas (viaje_id, pasajero_id, lugar, lat, lng, en_camino, pendiente, personas)
  values (v.id, auth.uid(), nullif(trim(coalesce(p_lugar, '')), ''), p_lat, p_lng, v_en_ruta, v_en_ruta, p_personas)
  returning id into v_id;
  return v_id;
end;
$$;

-- Sin vencimiento de 5 minutos
select cron.unschedule('vencer-pedidos') where exists (select 1 from cron.job where jobname = 'vencer-pedidos');
drop function if exists public.vencer_pedidos();

-- Las solicitudes que estaban esperando confirmación (no los pedidos en el camino) quedan confirmadas
update public.reservas set pendiente = false, aceptada_en = coalesce(aceptada_en, now())
 where estado = 'activa' and pendiente and not en_camino;
