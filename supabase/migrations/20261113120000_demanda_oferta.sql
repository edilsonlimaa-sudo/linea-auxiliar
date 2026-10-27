-- §5.22 Demanda y oferta (R86–R87): cuentas de prueba que no cuentan y el histórico por hora para el panel.

-- R86: el admin marca las cuentas de prueba. Como interfaz, no está en los grant de update de perfiles
alter table public.perfiles add column de_prueba boolean not null default false;
comment on column public.perfiles.de_prueba is 'R86: cuenta de prueba; no cuenta en Demanda y oferta. Solo la cambia el admin.';

create function public.admin_marcar_prueba(p_id uuid, p_prueba boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador marca cuentas de prueba'; end if;
  update public.perfiles set de_prueba = coalesce(p_prueba, false) where id = p_id and rol in ('pasajero', 'chofer');
  if not found then raise exception 'No encontramos esa cuenta'; end if;
end;
$$;
revoke execute on function public.admin_marcar_prueba(uuid, boolean) from anon, public;
grant execute on function public.admin_marcar_prueba(uuid, boolean) to authenticated;

-- R87: por día y hora de Caracas, entre dos fechas (incluidas). "valle" = hacia Valle Grande (desde Gina), "centro" =
-- hacia el Centro. Solo filas con algo. La app promedia y filtra los días.
create function public.admin_demanda_oferta(p_desde date, p_hasta date)
returns table (
  dia date, hora int,
  valle_quieren int, valle_llevados int, valle_otro int, valle_vencio int, valle_desistio int,
  centro_llevados int, centro_no_atendidos int,
  valle_salidas int, valle_puestos int, centro_salidas int, centro_puestos int,
  choferes int, llevados_sin_app int
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_ini timestamptz := p_desde::timestamp at time zone 'America/Caracas';
  v_fin timestamptz := (p_hasta + 1)::timestamp at time zone 'America/Caracas';
begin
  if not public.es_admin() then raise exception 'Solo el administrador ve la demanda'; end if;
  return query
  with prueba as (select id from public.perfiles where de_prueba),
  -- Anotaciones en la lista; la que empieza menos de 60 min después de cerrarse la anterior de la misma persona
  -- sigue la misma espera
  l as (
    select l.pasajero_id, l.creada_en, l.personas, l.estado, lp.motivo_salida,
           lag(coalesce(l.cerrada_en, l.vence_en)) over (partition by l.pasajero_id order by l.creada_en) fin_anterior
      from public.lista_gina l left join public.lista_gina_privado lp on lp.id = l.id
     where l.creada_en >= v_ini and l.creada_en < v_fin and l.pasajero_id not in (select id from prueba)
  ),
  numeradas as (
    select *, sum(case when fin_anterior is null or creada_en > fin_anterior + interval '60 minutes' then 1 else 0 end)
                over (partition by pasajero_id order by creada_en) espera
      from l
  ),
  esperas as (
    select min(creada_en) cuando, max(personas) personas,
           bool_or(estado in ('subio', 'en_carro')) llevada,
           (array_agg(estado order by creada_en desc))[1] estado_final,
           (array_agg(motivo_salida order by creada_en desc))[1] motivo_final
      from numeradas group by pasajero_id, espera
  ),
  reservas as (
    select r.creado_en cuando, r.personas, r.estado, r.pasajero_id is null sin_app, v.sentido,
           r.id in (select reserva_id from public.lista_gina where reserva_id is not null) desde_lista
      from public.reservas r join public.viajes v on v.id = r.viaje_id
     where r.creado_en >= v_ini and r.creado_en < v_fin
       and v.chofer_id not in (select id from prueba)
       and (r.pasajero_id is null or r.pasajero_id not in (select id from prueba))
  ),
  viajes as (
    select v.chofer_id, v.sentido, v.puestos, v.salida_en, v.creado_en,
           -- Un viaje que quedó abierto por olvido no cuenta como trabajo para siempre: ninguno dura más de 6 h
           least(coalesce(v.llegada_en, case when v.estado in ('cancelado', 'finalizado') then v.estado_en end, now()),
                 v.creado_en + interval '6 hours') termina
      from public.viajes v
     where v.chofer_id not in (select id from prueba) and v.creado_en < v_fin
  ),
  horas as (
    select h from generate_series(v_ini, least(v_fin, now()) - interval '1 second', interval '1 hour') h
  ),
  -- Una fila por hecho; después se suma por día y hora
  hechos (cuando, valle_quieren, valle_llevados, valle_otro, valle_vencio, valle_desistio, centro_llevados,
          centro_no_atendidos, valle_salidas, valle_puestos, centro_salidas, centro_puestos, choferes, llevados_sin_app) as (
    select cuando, personas,
           case when llevada then personas else 0 end,
           case when not llevada and motivo_final in ('van', 'otro_carro') then personas else 0 end,
           case when not llevada and estado_final = 'vencida' then personas else 0 end,
           case when not llevada and estado_final <> 'esperando' and estado_final <> 'vencida'
                     and coalesce(motivo_final, '') not in ('van', 'otro_carro') then personas else 0 end,
           0, 0, 0, 0, 0, 0, 0, 0
      from esperas
    union all
    -- Hacia Valle Grande fuera de la lista: pedidos en el camino y gente sin app que subió el chofer
    select cuando, personas,
           case when estado in ('subio', 'bajo') then personas else 0 end, 0, 0,
           case when estado in ('sin_puesto', 'rechazada', 'no_llego') then personas else 0 end,
           0, 0, 0, 0, 0, 0, 0,
           case when sin_app and estado in ('subio', 'bajo') then personas else 0 end
      from reservas where sentido = 'centro_a_vg' and not desde_lista and estado <> 'cancelada'
    union all
    select cuando, 0, 0, 0, 0, 0,
           case when estado in ('subio', 'bajo') then personas else 0 end,
           case when estado in ('sin_puesto', 'rechazada', 'no_llego') then personas else 0 end,
           0, 0, 0, 0, 0,
           case when sin_app and estado in ('subio', 'bajo') then personas else 0 end
      from reservas where sentido = 'vg_a_centro'
    union all
    select salida_en, 0, 0, 0, 0, 0, 0, 0,
           case when sentido = 'centro_a_vg' then 1 else 0 end, case when sentido = 'centro_a_vg' then puestos else 0 end,
           case when sentido = 'vg_a_centro' then 1 else 0 end, case when sentido = 'vg_a_centro' then puestos else 0 end,
           0, 0
      from viajes where salida_en >= v_ini and salida_en < v_fin
    union all
    -- Choferes trabajando: con algún viaje abierto en esa hora
    select h, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
           (select count(distinct chofer_id) from viajes where creado_en < h + interval '1 hour' and termina > h)::int, 0
      from horas
  )
  select (cuando at time zone 'America/Caracas')::date, extract(hour from cuando at time zone 'America/Caracas')::int,
         sum(valle_quieren)::int, sum(valle_llevados)::int, sum(valle_otro)::int, sum(valle_vencio)::int,
         sum(valle_desistio)::int, sum(centro_llevados)::int, sum(centro_no_atendidos)::int,
         sum(valle_salidas)::int, sum(valle_puestos)::int, sum(centro_salidas)::int, sum(centro_puestos)::int,
         sum(choferes)::int, sum(llevados_sin_app)::int
    from hechos
   group by 1, 2
  having sum(valle_quieren) + sum(centro_llevados) + sum(centro_no_atendidos) + sum(valle_salidas)
         + sum(centro_salidas) + sum(choferes) > 0
   order by 1, 2;
end;
$$;
revoke execute on function public.admin_demanda_oferta(date, date) from anon, public;
grant execute on function public.admin_demanda_oferta(date, date) to authenticated;
