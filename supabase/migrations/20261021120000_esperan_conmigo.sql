-- =====================================================================================
-- "También esperan al Centro" (docs/especificacion.md §8 Esperando, §6): quien espera ve a los demás que esperan
-- en su mismo sentido, con nombre corto y desde cuándo. Nunca el lugar ni el teléfono.
-- Sin espera activa propia, no devuelve nada.
-- =====================================================================================

create function public.esperan_conmigo()
returns table (nombre_corto text, desde timestamptz, soy_yo boolean)
language sql stable security definer set search_path = '' as $$
  with mia as (
    select sentido from public.esperas
     where pasajero_id = auth.uid() and estado = 'esperando' and creado_en > now() - interval '2 hours'
  )
  select public.nombre_corto(p.nombre), e.creado_en, e.pasajero_id = auth.uid()
    from public.esperas e
    join mia on mia.sentido = e.sentido
    join public.perfiles p on p.id = e.pasajero_id
   where e.estado = 'esperando' and e.creado_en > now() - interval '2 hours'
   order by e.creado_en;
$$;

revoke execute on function public.esperan_conmigo() from anon, public;
grant execute on function public.esperan_conmigo() to authenticated;
