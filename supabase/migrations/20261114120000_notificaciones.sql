-- §5.23 Notificaciones (R88–R89). El admin manda una (aviso, consejo o novedad) a todos los pasajeros de la interfaz
-- nueva o a personas escogidas; cada destinatario tiene su copia y su hora de lectura. Cada uno ve solo las suyas.

create table public.notificaciones (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('aviso', 'consejo', 'novedad')),
  titulo      text not null check (char_length(btrim(titulo)) between 1 and 60),
  texto       text not null check (char_length(btrim(texto)) between 1 and 280),
  autor_id    uuid not null default auth.uid() references public.perfiles (id),
  creada_en   timestamptz not null default now(),
  retirada_en timestamptz -- R88: retirada, ya no la ve nadie
);
create index notificaciones_recientes on public.notificaciones (creada_en desc);

create table public.notificacion_destinos (
  notificacion_id uuid not null references public.notificaciones (id) on delete cascade,
  persona_id      uuid not null references public.perfiles (id) on delete cascade,
  leida_en        timestamptz,
  primary key (notificacion_id, persona_id)
);
create index notificacion_destinos_sin_leer on public.notificacion_destinos (persona_id) where leida_en is null;

alter table public.notificaciones enable row level security;
alter table public.notificacion_destinos enable row level security;
create policy "notificacion_destinos: las propias o el admin" on public.notificacion_destinos
  for select to authenticated using (persona_id = auth.uid() or public.es_admin());
create policy "notificaciones: las que me mandaron (sin retirar) o el admin" on public.notificaciones
  for select to authenticated using (
    public.es_admin()
    or (retirada_en is null and exists (
      select 1 from public.notificacion_destinos d where d.notificacion_id = notificaciones.id and d.persona_id = auth.uid()))
  );
grant select on public.notificaciones, public.notificacion_destinos to authenticated;

-- Para que la campana y la tarjeta de Inicio se actualicen solas (EnVivo)
alter publication supabase_realtime add table public.notificacion_destinos;

-- R88: el admin la manda. p_ids null = todos los pasajeros aprobados de la interfaz nueva; si no, de esos, los
-- escogidos. Devuelve a cuántos les llegó
create function public.admin_enviar_notificacion(p_tipo text, p_titulo text, p_texto text, p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_texto  text := btrim(coalesce(p_texto, ''));
  v_id uuid;
  v_n int;
begin
  if not public.es_admin() then raise exception 'Solo el administrador manda notificaciones'; end if;
  if p_tipo is null or p_tipo not in ('aviso', 'consejo', 'novedad') then raise exception 'Escoge el tipo de notificación'; end if;
  if v_titulo = '' then raise exception 'Escribe el título'; end if;
  if char_length(v_titulo) > 60 then raise exception 'El título es muy largo (máximo 60 letras)'; end if;
  if v_texto = '' then raise exception 'Escribe el texto'; end if;
  if char_length(v_texto) > 280 then raise exception 'El texto es muy largo (máximo 280 letras)'; end if;

  insert into public.notificaciones (tipo, titulo, texto) values (p_tipo, v_titulo, v_texto) returning id into v_id;
  insert into public.notificacion_destinos (notificacion_id, persona_id)
  select v_id, p.id from public.perfiles p
   where p.rol = 'pasajero' and p.estado = 'aprobado' and p.interfaz = 'nueva'
     and (p_ids is null or p.id = any (p_ids));
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Nadie recibiría esta notificación: escoge pasajeros de la interfaz nueva'; end if;
  return v_n;
end;
$$;
revoke execute on function public.admin_enviar_notificacion(text, text, text, uuid[]) from anon, public;
grant execute on function public.admin_enviar_notificacion(text, text, text, uuid[]) to authenticated;

-- R88: retirarla (desaparece para todos)
create function public.admin_retirar_notificacion(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador retira notificaciones'; end if;
  update public.notificaciones set retirada_en = now() where id = p_id and retirada_en is null;
  if not found then raise exception 'Esa notificación ya no está'; end if;
end;
$$;
revoke execute on function public.admin_retirar_notificacion(uuid) from anon, public;
grant execute on function public.admin_retirar_notificacion(uuid) to authenticated;

-- R89: marcar como leídas las propias (p_ids null = todas). Devuelve cuántas cambiaron
create function public.marcar_notificaciones_leidas(p_ids uuid[] default null)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  update public.notificacion_destinos set leida_en = now()
   where persona_id = auth.uid() and leida_en is null and (p_ids is null or notificacion_id = any (p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function public.marcar_notificaciones_leidas(uuid[]) from anon, public;
grant execute on function public.marcar_notificaciones_leidas(uuid[]) to authenticated;

-- Panel: las enviadas con a cuántos llegó y cuántos la vieron
create function public.admin_notificaciones()
returns table (id uuid, tipo text, titulo text, texto text, creada_en timestamptz, retirada_en timestamptz,
               destinatarios int, vistas int)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.es_admin() then raise exception 'Solo el administrador ve las notificaciones enviadas'; end if;
  return query
  select n.id, n.tipo, n.titulo, n.texto, n.creada_en, n.retirada_en,
         count(d.persona_id)::int, count(d.leida_en)::int
    from public.notificaciones n left join public.notificacion_destinos d on d.notificacion_id = n.id
   group by n.id
   order by n.creada_en desc
   limit 100;
end;
$$;
revoke execute on function public.admin_notificaciones() from anon, public;
grant execute on function public.admin_notificaciones() to authenticated;
