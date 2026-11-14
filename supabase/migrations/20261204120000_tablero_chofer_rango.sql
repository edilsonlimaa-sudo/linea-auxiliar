-- R111: el Inicio de la app del chofer mira también por día y por semana (Hoy · Semana · Mes). `tablero_chofer_rango`
-- da lo mismo que el mes (viajes, pasajeros, lo cobrado estimado) para cualquier tramo de hasta 31 días, nunca futuro,
-- comparado con el tramo igual de largo justo antes, cada día del tramo y sus viajes (para la lista de Hoy). Solo lo
-- del propio chofer (R112).

create function public.tablero_chofer_rango(p_desde date, p_hasta date)
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
      select vj.id as viaje_id, vj.sale::date as dia, r.personas, r.gratis,
             -- R79: la tarifa a la hora en que salió el viaje
             case when extract(isodow from vj.sale) = 7 or extract(hour from vj.sale) >= 18 or extract(hour from vj.sale) < 5
                  then 1300 else 1000 end as tarifa
        from viajes vj join public.reservas r on r.viaje_id = vj.id
       where r.estado in ('subio', 'bajo')
    )
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
