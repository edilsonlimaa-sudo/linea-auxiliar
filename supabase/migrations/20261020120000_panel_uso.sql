-- =====================================================================================
-- Panel del admin: Uso de la app (docs/especificacion.md §8, Resumen punto 5). Solo lectura.
-- Cuenta a los pasajeros llevados (subió o se bajó antes) en viajes terminados desde p_desde.
-- =====================================================================================

-- Cómo entraron al carro, por chofer: por la app, por la app en el camino (R28) o anotados a mano (R36)
create function public.admin_uso_por_chofer(p_desde timestamptz)
returns table (chofer_id uuid, nombre text, app int, en_camino int, a_mano int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
    select v.chofer_id, p.nombre,
           (count(*) filter (where r.pasajero_id is not null and not r.en_camino))::int,
           (count(*) filter (where r.pasajero_id is not null and r.en_camino))::int,
           (count(*) filter (where r.pasajero_id is null))::int
      from public.reservas r
      join public.viajes v on v.id = r.viaje_id
      join public.perfiles p on p.id = v.chofer_id
     where v.estado = 'finalizado' and v.llegada_en >= p_desde and r.estado in ('subio', 'bajo')
     group by v.chofer_id, p.nombre
     order by count(*) desc;
end;
$$;

-- Pasajeros identificados que viajaron: cuántas veces en el período, el último viaje y su primer viaje de siempre
create function public.admin_uso_pasajeros(p_desde timestamptz)
returns table (pasajero_id uuid, nombre text, foto_path text, viajes int, ultimo_viaje timestamptz, primer_viaje timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
    with llevados as (
      select r.pasajero_id, v.llegada_en
        from public.reservas r join public.viajes v on v.id = r.viaje_id
       where r.pasajero_id is not null and v.estado = 'finalizado' and r.estado in ('subio', 'bajo')
    )
    select l.pasajero_id, p.nombre, p.foto_path,
           (count(*) filter (where l.llegada_en >= p_desde))::int,
           max(l.llegada_en),
           min(l.llegada_en)
      from llevados l
      join public.perfiles p on p.id = l.pasajero_id
     group by l.pasajero_id, p.nombre, p.foto_path
    having count(*) filter (where l.llegada_en >= p_desde) > 0
     order by 4 desc, 5 desc;
end;
$$;

revoke execute on function public.admin_uso_por_chofer(timestamptz), public.admin_uso_pasajeros(timestamptz) from anon, public;
grant execute on function public.admin_uso_por_chofer(timestamptz), public.admin_uso_pasajeros(timestamptz) to authenticated;
