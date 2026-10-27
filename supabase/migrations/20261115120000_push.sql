-- §5.23 R90: avisos en el celular (Web Push). Cada aparato que la persona activa queda inscrito; al mandar una
-- notificación, el servidor (con la sesión del admin) lee las inscripciones de los destinatarios y les manda el aviso.

create table public.push_suscripciones (
  endpoint   text primary key,                -- la dirección del servicio de push de ese aparato (única)
  persona_id uuid not null references public.perfiles (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  creada_en  timestamptz not null default now()
);
create index push_suscripciones_persona on public.push_suscripciones (persona_id);

alter table public.push_suscripciones enable row level security;
create policy "push_suscripciones: las propias" on public.push_suscripciones
  for select to authenticated using (persona_id = auth.uid());
grant select on public.push_suscripciones to authenticated;

-- Activar en este aparato. Si el aparato ya estaba inscrito por otra cuenta (otra persona usó el teléfono), pasa a esta
create function public.guardar_suscripcion(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.perfiles := public._exigir_aprobado();
begin
  if coalesce(p_endpoint, '') !~ '^https://' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Este teléfono no dio los datos para avisarte';
  end if;
  insert into public.push_suscripciones (endpoint, persona_id, p256dh, auth) values (p_endpoint, p.id, p_p256dh, p_auth)
  on conflict (endpoint) do update set persona_id = excluded.persona_id, p256dh = excluded.p256dh, auth = excluded.auth,
                                       creada_en = now();
end;
$$;
revoke execute on function public.guardar_suscripcion(text, text, text) from anon, public;
grant execute on function public.guardar_suscripcion(text, text, text) to authenticated;

-- Desactivar en este aparato (o al cerrar sesión)
create function public.quitar_suscripcion(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_suscripciones where endpoint = p_endpoint and persona_id = auth.uid();
$$;
revoke execute on function public.quitar_suscripcion(text) from anon, public;
grant execute on function public.quitar_suscripcion(text) to authenticated;

-- Cuántos celulares recibieron el aviso de cada notificación (para el panel)
alter table public.notificaciones add column push_enviados int not null default 0;

-- R88 + R90: admin_enviar_notificacion devuelve ahora también el id, para mandar los avisos de esa notificación
drop function public.admin_enviar_notificacion(text, text, text, uuid[]);
create function public.admin_enviar_notificacion(p_tipo text, p_titulo text, p_texto text, p_ids uuid[] default null)
returns table (id uuid, destinatarios int) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
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

  insert into public.notificaciones (tipo, titulo, texto) values (p_tipo, v_titulo, v_texto) returning notificaciones.id into v_id;
  insert into public.notificacion_destinos (notificacion_id, persona_id)
  select v_id, p.id from public.perfiles p
   where p.rol = 'pasajero' and p.estado = 'aprobado' and p.interfaz = 'nueva'
     and (p_ids is null or p.id = any (p_ids));
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Nadie recibiría esta notificación: escoge pasajeros de la interfaz nueva'; end if;
  return query select v_id, v_n;
end;
$$;
revoke execute on function public.admin_enviar_notificacion(text, text, text, uuid[]) from anon, public;
grant execute on function public.admin_enviar_notificacion(text, text, text, uuid[]) to authenticated;

-- R90: los aparatos de los destinatarios de una notificación (solo el admin, al mandarla)
create function public.admin_suscripciones_de(p_notificacion uuid)
returns table (endpoint text, p256dh text, auth text) language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.es_admin() then raise exception 'Solo el administrador manda avisos'; end if;
  return query
  select s.endpoint, s.p256dh, s.auth
    from public.push_suscripciones s
    join public.notificacion_destinos d on d.persona_id = s.persona_id
   where d.notificacion_id = p_notificacion;
end;
$$;
revoke execute on function public.admin_suscripciones_de(uuid) from anon, public;
grant execute on function public.admin_suscripciones_de(uuid) to authenticated;

-- R90: cuántos avisos salieron y qué aparatos ya no existen (el servicio de push respondió que caducaron)
create function public.admin_registrar_push(p_notificacion uuid, p_enviados int, p_caducados text[] default '{}')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador manda avisos'; end if;
  update public.notificaciones set push_enviados = push_enviados + greatest(coalesce(p_enviados, 0), 0) where id = p_notificacion;
  delete from public.push_suscripciones where endpoint = any (coalesce(p_caducados, '{}'));
end;
$$;
revoke execute on function public.admin_registrar_push(uuid, int, text[]) from anon, public;
grant execute on function public.admin_registrar_push(uuid, int, text[]) to authenticated;

-- Panel: ahora con cuántos celulares recibieron el aviso
drop function public.admin_notificaciones();
create function public.admin_notificaciones()
returns table (id uuid, tipo text, titulo text, texto text, creada_en timestamptz, retirada_en timestamptz,
               destinatarios int, vistas int, push_enviados int)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.es_admin() then raise exception 'Solo el administrador ve las notificaciones enviadas'; end if;
  return query
  select n.id, n.tipo, n.titulo, n.texto, n.creada_en, n.retirada_en,
         count(d.persona_id)::int, count(d.leida_en)::int, n.push_enviados
    from public.notificaciones n left join public.notificacion_destinos d on d.notificacion_id = n.id
   group by n.id
   order by n.creada_en desc
   limit 100;
end;
$$;
revoke execute on function public.admin_notificaciones() from anon, public;
grant execute on function public.admin_notificaciones() to authenticated;
