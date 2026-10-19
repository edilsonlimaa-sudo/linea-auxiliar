-- =====================================================================================
-- Panel del admin: Resumen y actividad de cada cuenta (docs/especificacion.md §8, "Panel del admin").
-- Solo lectura.
-- =====================================================================================

-- Cómo va la línea: ahora, hoy (hora de Caracas) y la comunidad
create function public.admin_resumen()
returns table (
  viajes_en_curso     int,
  pasajeros_esperando int,
  viajes_hoy          int,
  pasajeros_hoy       int,
  estrellas_7d        numeric,
  calificaciones_7d   int,
  registros_7d        int
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_hoy date := (now() at time zone 'America/Caracas')::date;
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
  with terminados_hoy as (
    select v.id from public.viajes v
     where v.estado = 'finalizado' and (v.llegada_en at time zone 'America/Caracas')::date = v_hoy
  )
  select
    (select count(*)::int from public.viajes where estado in ('en_camino', 'llegando', 'en_parada', 'en_ruta')),
    (select count(*)::int from public.esperas where estado = 'esperando' and creado_en > now() - interval '2 hours'),
    (select count(*)::int from terminados_hoy),
    (select count(*)::int from public.reservas r where r.viaje_id in (select id from terminados_hoy) and r.estado in ('subio', 'bajo')),
    (select round(avg(estrellas), 1) from public.calificaciones where creado_en > now() - interval '7 days'),
    (select count(*)::int from public.calificaciones where creado_en > now() - interval '7 days'),
    (select count(*)::int from public.perfiles where rol <> 'admin' and creado_en > now() - interval '7 days');
end;
$$;

-- Actividad de cada cuenta, para las tarjetas de Choferes y Pasajeros
create function public.admin_actividad()
returns table (id uuid, conectado boolean, viajes int, estrellas numeric, calificaciones int, ultimo_viaje timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
  select p.id,
         p.conectado_en is not null,
         case when p.rol = 'chofer' then coalesce(ch.viajes, 0) else coalesce(pa.viajes, 0) end,
         ca.estrellas,
         coalesce(ca.cantidad, 0),
         case when p.rol = 'chofer' then ch.ultimo else pa.ultimo end
    from public.perfiles p
    left join lateral (
      select count(*)::int as viajes, max(v.llegada_en) as ultimo
        from public.viajes v where v.chofer_id = p.id and v.estado = 'finalizado'
    ) ch on p.rol = 'chofer'
    left join lateral (
      select count(*)::int as viajes, max(v.llegada_en) as ultimo
        from public.reservas r join public.viajes v on v.id = r.viaje_id
       where r.pasajero_id = p.id and r.estado in ('subio', 'bajo') and v.estado = 'finalizado'
    ) pa on p.rol = 'pasajero'
    left join lateral (
      select round(avg(c.estrellas), 1) as estrellas, count(*)::int as cantidad
        from public.calificaciones c where c.chofer_id = p.id
    ) ca on p.rol = 'chofer'
   where p.rol <> 'admin';
end;
$$;

revoke execute on function public.admin_resumen(), public.admin_actividad() from anon, public;
grant execute on function public.admin_resumen(), public.admin_actividad() to authenticated;
