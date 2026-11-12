-- R88: una notificación puede llevar un botón (texto + una pantalla de la app) · §5.28 R108–R109: la encuesta de la
-- salida fija (¿a qué hora, qué días, te anotamos para la prueba?), una respuesta por pasajero, solo la ve él y el admin

-- ——— R88: botón de la notificación ———
alter table public.notificaciones
  add column boton_texto text,
  add column boton_destino text,
  add constraint notificaciones_boton_completo check ((boton_texto is null) = (boton_destino is null)),
  add constraint notificaciones_boton_texto check (boton_texto is null or char_length(btrim(boton_texto)) between 1 and 24),
  -- Solo pantallas de la interfaz nueva: nunca un enlace de afuera
  add constraint notificaciones_boton_destino check (boton_destino is null or boton_destino ~ '^/n(/[a-z0-9-]+)+$');

drop function public.admin_enviar_notificacion(text, text, text, uuid[]);
create function public.admin_enviar_notificacion(p_tipo text, p_titulo text, p_texto text, p_ids uuid[] default null,
                                                 p_boton_texto text default null, p_boton_destino text default null)
returns table (id uuid, destinatarios int) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_texto  text := btrim(coalesce(p_texto, ''));
  v_boton  text := nullif(btrim(coalesce(p_boton_texto, '')), '');
  v_destino text := nullif(btrim(coalesce(p_boton_destino, '')), '');
  v_id uuid;
  v_n int;
begin
  if not public.es_admin() then raise exception 'Solo el administrador manda notificaciones'; end if;
  if p_tipo is null or p_tipo not in ('aviso', 'consejo', 'novedad') then raise exception 'Escoge el tipo de notificación'; end if;
  if v_titulo = '' then raise exception 'Escribe el título'; end if;
  if char_length(v_titulo) > 60 then raise exception 'El título es muy largo (máximo 60 letras)'; end if;
  if v_texto = '' then raise exception 'Escribe el texto'; end if;
  if char_length(v_texto) > 280 then raise exception 'El texto es muy largo (máximo 280 letras)'; end if;
  if (v_boton is null) <> (v_destino is null) then raise exception 'El botón necesita su texto y a dónde lleva'; end if;
  if v_boton is not null and char_length(v_boton) > 24 then raise exception 'El texto del botón es muy largo (máximo 24 letras)'; end if;
  if v_destino is not null and v_destino !~ '^/n(/[a-z0-9-]+)+$' then raise exception 'El botón solo puede llevar a una pantalla de la app'; end if;

  insert into public.notificaciones (tipo, titulo, texto, boton_texto, boton_destino)
  values (p_tipo, v_titulo, v_texto, v_boton, v_destino) returning notificaciones.id into v_id;
  insert into public.notificacion_destinos (notificacion_id, persona_id)
  select v_id, p.id from public.perfiles p
   where p.rol = 'pasajero' and p.estado = 'aprobado' and p.interfaz = 'nueva'
     and (p_ids is null or p.id = any (p_ids));
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Nadie recibiría esta notificación: escoge pasajeros de la interfaz nueva'; end if;
  return query select v_id, v_n;
end;
$$;
revoke execute on function public.admin_enviar_notificacion(text, text, text, uuid[], text, text) from anon, public;
grant execute on function public.admin_enviar_notificacion(text, text, text, uuid[], text, text) to authenticated;

-- Panel: ahora también con el botón
drop function public.admin_notificaciones();
create function public.admin_notificaciones()
returns table (id uuid, tipo text, titulo text, texto text, creada_en timestamptz, retirada_en timestamptz,
               destinatarios int, vistas int, push_enviados int, boton_texto text, boton_destino text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.es_admin() then raise exception 'Solo el administrador ve las notificaciones enviadas'; end if;
  return query
  select n.id, n.tipo, n.titulo, n.texto, n.creada_en, n.retirada_en,
         count(d.persona_id)::int, count(d.leida_en)::int, n.push_enviados, n.boton_texto, n.boton_destino
    from public.notificaciones n left join public.notificacion_destinos d on d.notificacion_id = n.id
   group by n.id
   order by n.creada_en desc
   limit 100;
end;
$$;
revoke execute on function public.admin_notificaciones() from anon, public;
grant execute on function public.admin_notificaciones() to authenticated;

-- R88: abrir el destino del botón cuenta como haberla visto. Marca las propias sin leer que llevan a esa pantalla
create function public.marcar_leidas_de_destino(p_destino text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  update public.notificacion_destinos d set leida_en = now()
    from public.notificaciones n
   where n.id = d.notificacion_id and d.persona_id = auth.uid() and d.leida_en is null
     and n.retirada_en is null and n.boton_destino = p_destino;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function public.marcar_leidas_de_destino(text) from anon, public;
grant execute on function public.marcar_leidas_de_destino(text) to authenticated;

-- ——— §5.28 R108: la encuesta de la salida fija ———
create table public.salida_fija_respuestas (
  persona_id     uuid primary key references public.perfiles (id) on delete cascade,
  compromiso     text not null check (compromiso in ('si', 'luego', 'no')),
  horario        text check (horario in ('17:15', '17:45', 'otra')),
  horario_otro   text check (horario_otro is null or char_length(horario_otro) between 1 and 40),
  dias           smallint[] check (dias is null or (cardinality(dias) between 1 and 5 and dias <@ array[1, 2, 3, 4, 5]::smallint[])),
  comentario     text check (comentario is null or char_length(comentario) <= 280),
  creada_en      timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  -- "No me sirve" no lleva hora ni días; las otras sí
  check ((compromiso = 'no') = (horario is null)),
  check ((compromiso = 'no') = (dias is null)),
  check ((horario = 'otra') = (horario_otro is not null))
);
alter table public.salida_fija_respuestas enable row level security;
create policy "salida_fija_respuestas: la propia o el admin" on public.salida_fija_respuestas
  for select to authenticated using (persona_id = auth.uid() or public.es_admin());
grant select on public.salida_fija_respuestas to authenticated;

-- R108: responder (o cambiar la respuesta). Solo pasajeros aprobados
create function public.responder_salida_fija(p_compromiso text, p_horario text default null, p_horario_otro text default null,
                                             p_dias smallint[] default null, p_comentario text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_otro text := nullif(btrim(coalesce(p_horario_otro, '')), '');
  v_comentario text := nullif(btrim(coalesce(p_comentario, '')), '');
  v_dias smallint[];
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if not exists (select 1 from public.perfiles where id = auth.uid() and rol = 'pasajero' and estado = 'aprobado') then
    raise exception 'Solo los pasajeros con la cuenta aprobada pueden responder';
  end if;
  if p_compromiso is null or p_compromiso not in ('si', 'luego', 'no') then raise exception 'Dinos si te anotamos para la prueba'; end if;
  if v_comentario is not null and char_length(v_comentario) > 280 then raise exception 'El comentario es muy largo (máximo 280 letras)'; end if;

  if p_compromiso = 'no' then
    p_horario := null; v_otro := null; v_dias := null;
  else
    if p_horario is null or p_horario not in ('17:15', '17:45', 'otra') then raise exception 'Escoge a qué hora te sirve'; end if;
    if p_horario = 'otra' then
      if v_otro is null then raise exception 'Escribe a qué hora te sirve'; end if;
      if char_length(v_otro) > 40 then raise exception 'La hora es muy larga (máximo 40 letras)'; end if;
    else
      v_otro := null;
    end if;
    select array_agg(distinct d order by d) into v_dias from unnest(coalesce(p_dias, '{}')) d where d between 1 and 5;
    if v_dias is null then raise exception 'Escoge al menos un día'; end if;
  end if;

  insert into public.salida_fija_respuestas (persona_id, compromiso, horario, horario_otro, dias, comentario)
  values (auth.uid(), p_compromiso, p_horario, v_otro, v_dias, v_comentario)
  on conflict (persona_id) do update
    set compromiso = excluded.compromiso, horario = excluded.horario, horario_otro = excluded.horario_otro,
        dias = excluded.dias, comentario = excluded.comentario, actualizada_en = now();
end;
$$;
revoke execute on function public.responder_salida_fija(text, text, text, smallint[], text) from anon, public;
grant execute on function public.responder_salida_fija(text, text, text, smallint[], text) to authenticated;

-- R109: el admin ve las respuestas con nombre y teléfono (para escribirles), la más nueva primero
create function public.admin_salida_fija()
returns table (persona_id uuid, nombre text, telefono text, compromiso text, horario text, horario_otro text,
               dias smallint[], comentario text, actualizada_en timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.es_admin() then raise exception 'Solo el administrador ve las respuestas'; end if;
  return query
  select r.persona_id, p.nombre, pp.telefono, r.compromiso, r.horario, r.horario_otro, r.dias, r.comentario, r.actualizada_en
    from public.salida_fija_respuestas r
    join public.perfiles p on p.id = r.persona_id
    left join public.perfiles_privados pp on pp.id = r.persona_id
   order by r.actualizada_en desc;
end;
$$;
revoke execute on function public.admin_salida_fija() from anon, public;
grant execute on function public.admin_salida_fija() to authenticated;
