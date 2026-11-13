-- R111: el tablero del chofer (Inicio de la app nativa). Solo sus propios números (R112): hoy, el mes contra el mes
-- pasado a la misma fecha, los pasajeros de cada día, lo cobrado estimado y sus opiniones. Fechas en hora de Caracas;
-- un viaje cuenta si terminó (finalizado) y en el día en que salió; un pasajero, si subió o se bajó, con su grupo (R57).

create function public.tablero_chofer()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_yo uuid := (public._exigir_chofer()).id;
  v_hoy date := public._hoy_caracas();
  v_ini date := date_trunc('month', v_hoy)::date;
  -- El mes pasado hasta la misma fecha (si el mes pasado es más corto, hasta su último día)
  v_ini_ant date := (date_trunc('month', v_hoy) - interval '1 month')::date;
  v_fin_ant date := least(v_ini_ant + (v_hoy - v_ini), v_ini - 1);
begin
  return (
    with viajes as (
      select v.id, (coalesce(v.salida_en, v.creado_en) at time zone 'America/Caracas') as sale
        from public.viajes v
       where v.chofer_id = v_yo and v.estado = 'finalizado'
         and coalesce(v.salida_en, v.creado_en) >= (v_ini_ant::timestamp at time zone 'America/Caracas')
    ),
    llevados as (
      select vj.id as viaje_id, vj.sale::date as dia, r.personas, r.gratis,
             -- R79: la tarifa a la hora en que salió el viaje
             case when extract(isodow from vj.sale) = 7 or extract(hour from vj.sale) >= 18 or extract(hour from vj.sale) < 5
                  then 1300 else 1000 end as tarifa
        from viajes vj join public.reservas r on r.viaje_id = vj.id
       where r.estado in ('subio', 'bajo')
    ),
    opiniones as (
      select c.estrellas, c.etiquetas, c.comentario, c.creado_en,
             (c.creado_en at time zone 'America/Caracas')::date >= v_ini as del_mes
        from public.calificaciones c where c.chofer_id = v_yo
    )
    select jsonb_build_object(
      'hoy', jsonb_build_object(
        'viajes', (select count(*) from viajes where sale::date = v_hoy),
        'pasajeros', (select coalesce(sum(personas), 0) from llevados where dia = v_hoy),
        'abiertos', (select count(*) from public.viajes v where v.chofer_id = v_yo
                      and v.estado not in ('finalizado', 'cancelado'))
      ),
      'mes', jsonb_build_object(
        'desde', v_ini,
        'viajes', (select count(*) from viajes where sale::date >= v_ini),
        'pasajeros', (select coalesce(sum(personas), 0) from llevados where dia >= v_ini),
        'pasajeros_antes', (select coalesce(sum(personas), 0) from llevados where dia between v_ini_ant and v_fin_ant),
        'viajes_antes', (select count(*) from viajes where sale::date between v_ini_ant and v_fin_ant),
        -- Cada día del mes hasta hoy, también los de cero
        'dias', (select jsonb_agg(jsonb_build_object('dia', d::date,
                         'pasajeros', (select coalesce(sum(personas), 0) from llevados where dia = d::date)) order by d)
                   from generate_series(v_ini, v_hoy, interval '1 day') d)
      ),
      -- Estimado: la línea no ve los pagos entre pasajero y chofer. El viaje gratis (R103) es un pasaje por reserva
      'cobrado', (
        select jsonb_build_object(
                 'pasajes', coalesce(sum(personas * tarifa), 0),
                 'gratis', coalesce(sum(case when gratis then tarifa else 0 end), 0),
                 'cuotas', (select coalesce(sum(cp.monto), 0) from public.cuota_pagos cp
                             where cp.chofer_id = v_yo and cp.estado = 'aprobado' and cp.dia between v_ini and v_hoy))
          from llevados where dia >= v_ini
      ),
      'opiniones', jsonb_build_object(
        'promedio', (select round(avg(estrellas), 2) from opiniones),
        'cantidad', (select count(*) from opiniones),
        'promedio_mes', (select round(avg(estrellas), 2) from opiniones where del_mes),
        'cantidad_mes', (select count(*) from opiniones where del_mes),
        'etiquetas', coalesce((select jsonb_agg(jsonb_build_object('etiqueta', e, 'veces', n) order by n desc, e)
                                 from (select e, count(*) n from opiniones, unnest(etiquetas) e
                                        group by e order by count(*) desc, e limit 4) t), '[]'::jsonb),
        -- Sin nombres (R52)
        'comentarios', coalesce((select jsonb_agg(jsonb_build_object('estrellas', estrellas, 'comentario', comentario, 'creado_en', creado_en) order by creado_en desc)
                                   from (select * from opiniones where nullif(btrim(comentario), '') is not null
                                          order by creado_en desc limit 2) t), '[]'::jsonb)
      )
    )
  );
end $$;

revoke execute on function public.tablero_chofer() from anon, public;
grant execute on function public.tablero_chofer() to authenticated;
