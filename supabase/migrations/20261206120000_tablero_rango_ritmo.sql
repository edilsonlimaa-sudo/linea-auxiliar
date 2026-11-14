-- R111: el día del tablero responde "¿está valiendo la pena?". tablero_chofer_rango agrega, para un solo día:
-- `antes_a_esta_hora` (si el día es hoy: lo de ayer hasta la misma hora de ahora, no el día entero) y `mismo_dia` (el
-- promedio de ese día de la semana en las 8 semanas anteriores, de los días que trabajó). El resto queda igual.

create or replace function public.tablero_chofer_rango(p_desde date, p_hasta date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_yo uuid := (public._exigir_chofer()).id;
  v_hoy date := public._hoy_caracas();
  v_desde date := least(p_desde, v_hoy);
  v_hasta date := least(greatest(p_hasta, p_desde), v_hoy);
  v_largo int;
  v_ini_ant date;
  v_fin_ant date;
begin
  if p_desde is null or p_hasta is null then raise exception 'Faltan las fechas'; end if;
  if v_hasta - v_desde > 30 then raise exception 'Hasta 31 días'; end if;
  v_largo := v_hasta - v_desde + 1;
  v_fin_ant := v_desde - 1;
  v_ini_ant := v_desde - v_largo;
  return (
    with viajes as (
      select v.id, v.sentido, v.puestos, v.salida_en, v.llegada_en,
             (coalesce(v.salida_en, v.creado_en) at time zone 'America/Caracas') as sale
        from public.viajes v
       where v.chofer_id = v_yo and v.estado = 'finalizado'
         and coalesce(v.salida_en, v.creado_en) >= (v_ini_ant::timestamp at time zone 'America/Caracas')
         and coalesce(v.salida_en, v.creado_en) < ((v_hasta + 1)::timestamp at time zone 'America/Caracas')
    ),
    llevados as (
      select vj.id as viaje_id, vj.sale, vj.sale::date as dia, r.personas, r.gratis,
             -- R79: la tarifa a la hora en que salió el viaje
             case when extract(isodow from vj.sale) = 7 or extract(hour from vj.sale) >= 18 or extract(hour from vj.sale) < 5
                  then 1300 else 1000 end as tarifa
        from viajes vj join public.reservas r on r.viaje_id = vj.id
       where r.estado in ('subio', 'bajo')
    ),
    -- El mismo día de la semana en las 8 semanas anteriores (solo para un día): "un sábado normal tuyo"
    mismo as (
      select x.sale::date as dia, x.personas,
             case when extract(isodow from x.sale) = 7 or extract(hour from x.sale) >= 18 or extract(hour from x.sale) < 5
                  then 1300 else 1000 end as tarifa
        from (select (coalesce(v.salida_en, v.creado_en) at time zone 'America/Caracas') as sale, r.personas
                from public.viajes v join public.reservas r on r.viaje_id = v.id
               where v_largo = 1 and v.chofer_id = v_yo and v.estado = 'finalizado' and r.estado in ('subio', 'bajo')
                 and coalesce(v.salida_en, v.creado_en) >= ((v_desde - 56)::timestamp at time zone 'America/Caracas')
                 and coalesce(v.salida_en, v.creado_en) < (v_desde::timestamp at time zone 'America/Caracas')) x
       where extract(isodow from x.sale) = extract(isodow from v_desde)
    ),
    mismo_por_dia as (select dia, sum(personas) as pasajeros, sum(personas * tarifa) as pasajes from mismo group by dia)
    select jsonb_build_object(
      'desde', v_desde,
      'hasta', v_hasta,
      'viajes', (select count(*) from viajes where sale::date between v_desde and v_hasta),
      'pasajeros', (select coalesce(sum(personas), 0) from llevados where dia between v_desde and v_hasta),
      'viajes_antes', (select count(*) from viajes where sale::date between v_ini_ant and v_fin_ant),
      'pasajeros_antes', (select coalesce(sum(personas), 0) from llevados where dia between v_ini_ant and v_fin_ant),
      -- Estimado, como en tablero_chofer: pasajes, menos los gratis (R103) y las cuotas aprobadas (R77)
      'cobrado', jsonb_build_object(
        'pasajes', (select coalesce(sum(personas * tarifa), 0) from llevados where dia between v_desde and v_hasta),
        'gratis', (select coalesce(sum(case when gratis then tarifa else 0 end), 0) from llevados where dia between v_desde and v_hasta),
        'cuotas', (select coalesce(sum(cp.monto), 0) from public.cuota_pagos cp
                    where cp.chofer_id = v_yo and cp.estado = 'aprobado' and cp.dia between v_desde and v_hasta)
      ),
      -- Hoy: ayer hasta la misma hora de ahora (a las 10:00 a. m. no se compara con el día entero de ayer)
      'antes_a_esta_hora', case when v_largo = 1 and v_hasta = v_hoy then jsonb_build_object(
        'pasajes', (select coalesce(sum(personas * tarifa), 0) from llevados
                     where dia = v_hoy - 1 and sale::time <= (now() at time zone 'America/Caracas')::time),
        'pasajeros', (select coalesce(sum(personas), 0) from llevados
                       where dia = v_hoy - 1 and sale::time <= (now() at time zone 'America/Caracas')::time)) end,
      'mismo_dia', case when v_largo = 1 then (select jsonb_build_object('dias', count(*), 'pasajes', coalesce(round(avg(pasajes)), 0),
                                                                   'pasajeros', coalesce(round(avg(pasajeros), 1), 0))
                                                  from mismo_por_dia) end,
      'neto_antes', (select coalesce(sum(personas * tarifa) - sum(case when gratis then tarifa else 0 end), 0)
                       from llevados where dia between v_ini_ant and v_fin_ant)
                    - (select coalesce(sum(cp.monto), 0) from public.cuota_pagos cp
                        where cp.chofer_id = v_yo and cp.estado = 'aprobado' and cp.dia between v_ini_ant and v_fin_ant),
      'dias', (select jsonb_agg(jsonb_build_object(
                        'dia', d::date,
                        'viajes', (select count(*) from viajes where sale::date = d::date),
                        'pasajeros', (select coalesce(sum(personas), 0) from llevados where dia = d::date),
                        'pasajes', (select coalesce(sum(personas * tarifa), 0) from llevados where dia = d::date)) order by d)
                 from generate_series(v_desde, v_hasta, interval '1 day') d),
      -- Sus viajes del tramo, el último primero (la lista de Hoy)
      'lista', coalesce((select jsonb_agg(jsonb_build_object(
                          'id', vj.id, 'sentido', vj.sentido, 'puestos', vj.puestos,
                          'salida_en', vj.salida_en, 'llegada_en', vj.llegada_en,
                          'personas', (select coalesce(sum(l.personas), 0) from llevados l where l.viaje_id = vj.id),
                          'pasajes', (select coalesce(sum(l.personas * l.tarifa), 0) from llevados l where l.viaje_id = vj.id))
                          order by vj.sale desc)
                           from viajes vj where vj.sale::date between v_desde and v_hasta), '[]'::jsonb)
    )
  );
end $$;

revoke execute on function public.tablero_chofer_rango(date, date) from anon, public;
grant execute on function public.tablero_chofer_rango(date, date) to authenticated;
