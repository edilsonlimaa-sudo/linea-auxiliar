-- §5.20 Sugerencias y opinión sobre la app (R81–R82). Pasajeros y choferes le escriben al admin; la opinión
-- ("¿Qué tal la app?") va en la misma tabla con sus estrellas. Solo la ven quien la escribió y el admin.

create table public.sugerencias (
  id        uuid primary key default gen_random_uuid(),
  autor_id  uuid not null references public.perfiles (id) on delete cascade,
  texto     text check (char_length(texto) <= 1000),
  estrellas int check (estrellas between 1 and 5), -- solo en la opinión sobre la app (R82)
  creada_en timestamptz not null default now(),
  leida_en  timestamptz,
  check (estrellas is not null or nullif(btrim(coalesce(texto, '')), '') is not null)
);
create index sugerencias_recientes on public.sugerencias (creada_en desc);
create index sugerencias_autor on public.sugerencias (autor_id, creada_en desc);

alter table public.sugerencias enable row level security;
create policy "sugerencias: las propias o el admin" on public.sugerencias
  for select to authenticated using (autor_id = auth.uid() or public.es_admin());
grant select on public.sugerencias to authenticated;

-- Para que nadie llene la bandeja: hasta 5 por hora
create function public._sin_abuso_sugerencias() returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.sugerencias where autor_id = auth.uid() and creada_en > now() - interval '1 hour') >= 5 then
    raise exception 'Ya enviaste varias seguidas. Espera un rato para enviar otra';
  end if;
end;
$$;
revoke execute on function public._sin_abuso_sugerencias() from anon, public, authenticated;

-- R81: una sugerencia (pasajeros y choferes aprobados)
create function public.enviar_sugerencia(p_texto text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  p public.perfiles := public._exigir_aprobado();
  v_texto text := nullif(btrim(coalesce(p_texto, '')), '');
  v_id uuid;
begin
  if p.rol not in ('pasajero', 'chofer') then raise exception 'Solo pasajeros y choferes envían sugerencias'; end if;
  if v_texto is null then raise exception 'Escribe tu sugerencia'; end if;
  if char_length(v_texto) > 1000 then raise exception 'Es muy larga (máximo 1.000 letras)'; end if;
  perform public._sin_abuso_sugerencias();
  insert into public.sugerencias (autor_id, texto) values (p.id, v_texto) returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.enviar_sugerencia(text) from anon, public;
grant execute on function public.enviar_sugerencia(text) to authenticated;

-- R82: ¿se le pide la opinión? Pasajero con 3 viajes o más, chofer con 10 terminados, y nadie que opinó en 60 días
create function public.puede_valorar_app()
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare p public.perfiles := public._exigir_aprobado();
begin
  if exists (select 1 from public.sugerencias where autor_id = p.id and estrellas is not null
              and creada_en > now() - interval '60 days') then
    return false;
  end if;
  if p.rol = 'pasajero' then
    return (select count(*) from public.reservas r join public.viajes v on v.id = r.viaje_id
             where r.pasajero_id = p.id and r.estado in ('subio', 'bajo') and v.estado = 'finalizado') >= 3;
  elsif p.rol = 'chofer' then
    return (select count(*) from public.viajes where chofer_id = p.id and estado = 'finalizado') >= 10;
  end if;
  return false;
end;
$$;
revoke execute on function public.puede_valorar_app() from anon, public;
grant execute on function public.puede_valorar_app() to authenticated;

-- R82: la opinión sobre la app (estrellas y comentario opcional)
create function public.valorar_app(p_estrellas int, p_comentario text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  p public.perfiles := public._exigir_aprobado();
  v_texto text := nullif(btrim(coalesce(p_comentario, '')), '');
  v_id uuid;
begin
  if p.rol not in ('pasajero', 'chofer') then raise exception 'Solo pasajeros y choferes opinan sobre la app'; end if;
  if p_estrellas is null or p_estrellas not between 1 and 5 then raise exception 'Toca las estrellas'; end if;
  if char_length(coalesce(v_texto, '')) > 1000 then raise exception 'Es muy largo (máximo 1.000 letras)'; end if;
  perform public._sin_abuso_sugerencias();
  insert into public.sugerencias (autor_id, texto, estrellas) values (p.id, v_texto, p_estrellas) returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.valorar_app(int, text) from anon, public;
grant execute on function public.valorar_app(int, text) to authenticated;

-- R81: el admin la marca leída (o no leída)
create function public.admin_marcar_sugerencia(p_id uuid, p_leida boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador lee las sugerencias'; end if;
  update public.sugerencias set leida_en = case when p_leida then now() end where id = p_id;
  if not found then raise exception 'Esa sugerencia no existe'; end if;
end;
$$;
revoke execute on function public.admin_marcar_sugerencia(uuid, boolean) from anon, public;
grant execute on function public.admin_marcar_sugerencia(uuid, boolean) to authenticated;
