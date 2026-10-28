-- R92: recorrido de los viajes. El teléfono del chofer guarda los puntos (IndexedDB) y los sube en lotes; aquí queda un
-- lote por fila (chofer, desde, hasta, puntos). Solo el admin lo lee; se borra a los 60 días. Apagado por defecto: el
-- admin lo enciende en el panel.

-- Ajustes de la app (una sola fila)
create table public.ajustes (
  id                boolean primary key default true check (id),
  grabar_recorridos boolean not null default false
);
insert into public.ajustes default values;
alter table public.ajustes enable row level security;
-- Sin políticas: se lee y se cambia solo con las funciones de abajo

create table public.trayectos (
  id         uuid primary key default gen_random_uuid(),
  chofer_id  uuid not null references public.perfiles (id) on delete cascade,
  desde      timestamptz not null,
  hasta      timestamptz not null,
  n          int not null,
  -- [[epoch en segundos, lat, lng, precisión en m], …], en orden
  puntos     jsonb not null,
  subido_en  timestamptz not null default now()
);
create index trayectos_chofer_desde on public.trayectos (chofer_id, desde);
alter table public.trayectos enable row level security;
create policy "trayectos: solo el admin" on public.trayectos for select to authenticated using (public.es_admin());

-- ¿Se graba? Lo pregunta el teléfono del chofer al empezar a compartir la posición
create function public.grabar_recorridos() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select grabar_recorridos from public.ajustes), false) and public.es_chofer()
$$;
revoke execute on function public.grabar_recorridos() from anon, public;
grant execute on function public.grabar_recorridos() to authenticated;

create function public.admin_grabar_recorridos(p_grabar boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador cambia esto'; end if;
  update public.ajustes set grabar_recorridos = p_grabar where id;
end;
$$;
revoke execute on function public.admin_grabar_recorridos(boolean) from anon, public;
grant execute on function public.admin_grabar_recorridos(boolean) to authenticated;

-- Cuánto llegó (para ver en el panel que funciona)
create function public.admin_recorridos_resumen()
returns table (grabando boolean, lotes int, puntos int, choferes int, ultimo timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador ve esto'; end if;
  return query
    select (select a.grabar_recorridos from public.ajustes a), count(*)::int, coalesce(sum(t.n), 0)::int,
           count(distinct t.chofer_id)::int, max(t.subido_en)
      from public.trayectos t where t.subido_en > now() - interval '7 days';
end;
$$;
revoke execute on function public.admin_recorridos_resumen() from anon, public;
grant execute on function public.admin_recorridos_resumen() to authenticated;

-- El chofer sube un lote: [[epoch en segundos, lat, lng, precisión], …]. Devuelve cuántos puntos guardó. Descarta lo
-- inválido, lo de hace más de 3 días o del futuro, y lo que ya estaba guardado (un reintento no duplica).
create function public.guardar_trayecto(p_puntos jsonb) returns int language plpgsql security definer set search_path = '' as $$
declare
  v_desde timestamptz;
  v_hasta timestamptz;
  v_n int;
  v_puntos jsonb;
begin
  perform public._exigir_chofer();
  if not coalesce((select grabar_recorridos from public.ajustes), false) then return 0; end if;
  if jsonb_typeof(p_puntos) <> 'array' or jsonb_array_length(p_puntos) > 2000 then
    raise exception 'Lote inválido';
  end if;

  with crudos as (
    select (e ->> 0)::double precision as t, (e ->> 1)::double precision as lat, (e ->> 2)::double precision as lng,
           case when jsonb_typeof(e -> 3) = 'number' then (e ->> 3)::double precision end as prec
      from jsonb_array_elements(p_puntos) e
     where jsonb_typeof(e) = 'array' and jsonb_array_length(e) >= 3
       and jsonb_typeof(e -> 0) = 'number' and jsonb_typeof(e -> 1) = 'number' and jsonb_typeof(e -> 2) = 'number'
  ),
  validos as (
    select distinct on (round(t)) round(t) as t, lat, lng, prec
      from crudos
     where lat between -90 and 90 and lng between -180 and 180
       and to_timestamp(t) between now() - interval '3 days' and now() + interval '5 minutes'
       -- Ya guardado en otro lote de este chofer
       and not exists (select 1 from public.trayectos tr
                        where tr.chofer_id = auth.uid() and to_timestamp(t) between tr.desde and tr.hasta)
     order by round(t)
  )
  select to_timestamp(min(t)), to_timestamp(max(t)), count(*)::int,
         jsonb_agg(jsonb_build_array(t::bigint, round(lat::numeric, 6), round(lng::numeric, 6), round(prec::numeric)) order by t)
    into v_desde, v_hasta, v_n, v_puntos from validos;
  if v_n = 0 then return 0; end if;

  insert into public.trayectos (chofer_id, desde, hasta, n, puntos) values (auth.uid(), v_desde, v_hasta, v_n, v_puntos);
  return v_n;
end;
$$;
revoke execute on function public.guardar_trayecto(jsonb) from anon, public;
grant execute on function public.guardar_trayecto(jsonb) to authenticated;

-- Limpieza diaria: lo de más de 60 días
create function public.borrar_recorridos_viejos() returns void language sql security definer set search_path = '' as $$
  delete from public.trayectos where hasta < now() - interval '60 days'
$$;
revoke execute on function public.borrar_recorridos_viejos() from anon, public, authenticated;
select cron.schedule('borrar-recorridos-viejos', '30 4 * * *', $$select public.borrar_recorridos_viejos()$$);
