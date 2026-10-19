-- =====================================================================================
-- Panel del admin: Demanda (docs/especificacion.md §8, "Panel del admin"). Solo lectura.
-- El admin sí ve quién espera, dónde y su teléfono (§6); los choferes solo ven cuántos (R31).
-- =====================================================================================

-- Quién espera ahora (esperas activas de las últimas 2 h, R35), primero quien lleva más tiempo
create function public.admin_demanda()
returns table (
  id          uuid,
  pasajero_id uuid,
  nombre      text,
  telefono    text,
  foto_path   text,
  sentido     public.sentido,
  lugar       text,
  lat         double precision,
  lng         double precision,
  creado_en   timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
    select e.id, e.pasajero_id, p.nombre, pp.telefono, p.foto_path, e.sentido, e.lugar, e.lat, e.lng, e.creado_en
      from public.esperas e
      join public.perfiles p on p.id = e.pasajero_id
      left join public.perfiles_privados pp on pp.id = e.pasajero_id
     where e.estado = 'esperando' and e.creado_en > now() - interval '2 hours'
     order by e.creado_en;
end;
$$;

-- Cómo se atendió la demanda hoy (hora de Caracas)
create function public.admin_demanda_hoy()
returns table (pedidos int, consiguieron int, sin_transporte int, cancelaron int, espera_promedio_min int)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_desde timestamptz := (now() at time zone 'America/Caracas')::date::timestamp at time zone 'America/Caracas';
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
    select count(*)::int,
           (count(*) filter (where e.estado = 'reservo'))::int,
           (count(*) filter (where e.estado = 'expirada'))::int,
           (count(*) filter (where e.estado = 'cancelada'))::int,
           (round(extract(epoch from avg(e.cerrada_en - e.creado_en) filter (where e.estado = 'reservo')) / 60))::int
      from public.esperas e
     where e.creado_en >= v_desde;
end;
$$;

revoke execute on function public.admin_demanda(), public.admin_demanda_hoy() from anon, public;
grant execute on function public.admin_demanda(), public.admin_demanda_hoy() to authenticated;
