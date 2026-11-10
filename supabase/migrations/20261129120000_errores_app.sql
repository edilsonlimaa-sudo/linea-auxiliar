-- Registro de errores (docs/especificacion.md §5.27, R106–R107): cada pantalla de error de la app queda anotada para
-- que el admin sepa qué pasó (antes solo se escribía en la consola del teléfono).

create table public.errores_app (
  id           uuid primary key default gen_random_uuid(),
  creado_en    timestamptz not null default now(),
  perfil_id    uuid references public.perfiles (id) on delete set null, -- null: sin sesión (al entrar o registrarse)
  interfaz     text not null check (interfaz in ('clasica', 'nueva', 'global')),
  tipo         text not null check (tipo in ('version', 'red', 'otro')),
  pantalla     text not null check (char_length(pantalla) <= 200),
  mensaje      text not null check (char_length(mensaje) <= 500),
  digest       text check (char_length(digest) <= 100),   -- el código que da Next a los errores del servidor
  version      text check (char_length(version) <= 40),   -- el commit desplegado
  aparato      text check (char_length(aparato) <= 300),  -- el navegador (userAgent)
  en_linea     boolean,                                   -- navigator.onLine al fallar
  volvio_hace  int check (volvio_hace >= 0),              -- segundos desde que volvió a la app (null: no salió)
  ocurrio_en   timestamptz                                -- cuándo pasó en el teléfono (si se anotó después, sin señal)
);
create index errores_app_recientes on public.errores_app (creado_en desc);
comment on table public.errores_app is 'R106: pantallas de error de la app. Solo el admin las lee; se borran a los 30 días.';

alter table public.errores_app enable row level security;
create policy "errores_app: solo admin" on public.errores_app for select to authenticated using (public.es_admin());
revoke all on public.errores_app from anon, authenticated;
grant select on public.errores_app to authenticated;

-- R106: anotar un error. Abierta también sin sesión (la pantalla de error puede salir al entrar o registrarse).
-- Nunca falla por datos largos: recorta. Topes por persona y en total para que nadie llene la base.
create function public.registrar_error(
  p_interfaz text, p_tipo text, p_pantalla text, p_mensaje text,
  p_digest text default null, p_version text default null, p_aparato text default null,
  p_en_linea boolean default null, p_volvio_hace int default null, p_ocurrio_en timestamptz default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := auth.uid();
begin
  if p_interfaz is null or p_interfaz not in ('clasica', 'nueva', 'global') then return; end if;
  if p_tipo is null or p_tipo not in ('version', 'red', 'otro') then return; end if;
  if v_yo is not null and (select count(*) from public.errores_app
                           where perfil_id = v_yo and creado_en > now() - interval '1 hour') >= 30 then
    return;
  end if;
  if (select count(*) from public.errores_app where creado_en > now() - interval '1 hour') >= 600 then return; end if;

  insert into public.errores_app (perfil_id, interfaz, tipo, pantalla, mensaje, digest, version, aparato, en_linea,
                                  volvio_hace, ocurrio_en)
  values (
    v_yo, p_interfaz, p_tipo,
    left(coalesce(nullif(btrim(p_pantalla), ''), '?'), 200),
    left(coalesce(nullif(btrim(p_mensaje), ''), '(sin mensaje)'), 500),
    left(nullif(btrim(p_digest), ''), 100),
    left(nullif(btrim(p_version), ''), 40),
    left(nullif(btrim(p_aparato), ''), 300),
    p_en_linea,
    case when p_volvio_hace >= 0 then least(p_volvio_hace, 86400) end,
    -- La hora del teléfono puede estar mal: solo se guarda si es de las últimas 48 h
    case when p_ocurrio_en between now() - interval '48 hours' and now() + interval '5 minutes' then p_ocurrio_en end
  );
end;
$$;
revoke execute on function public.registrar_error(text, text, text, text, text, text, text, boolean, int, timestamptz) from public;
grant execute on function public.registrar_error(text, text, text, text, text, text, text, boolean, int, timestamptz) to anon, authenticated;

-- R106: se borran solos a los 30 días
create function public._borrar_errores_viejos()
returns void language sql security definer set search_path = '' as $$
  delete from public.errores_app where creado_en < now() - interval '30 days';
$$;
revoke execute on function public._borrar_errores_viejos() from anon, authenticated, public;
select cron.schedule('borrar-errores-viejos', '30 4 * * *', $$select public._borrar_errores_viejos()$$);
