-- R106: la app nativa del chofer (../linea-apps) también anota sus pantallas de error, con interfaz 'app'. El resto
-- de registrar_error queda igual (topes, recortes, abierta sin sesión).

alter table public.errores_app drop constraint errores_app_interfaz_check;
alter table public.errores_app add constraint errores_app_interfaz_check check (interfaz in ('clasica', 'nueva', 'global', 'app'));

create or replace function public.registrar_error(
  p_interfaz text, p_tipo text, p_pantalla text, p_mensaje text,
  p_digest text default null, p_version text default null, p_aparato text default null,
  p_en_linea boolean default null, p_volvio_hace int default null, p_ocurrio_en timestamptz default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := auth.uid();
begin
  if p_interfaz is null or p_interfaz not in ('clasica', 'nueva', 'global', 'app') then return; end if;
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
    case when p_ocurrio_en between now() - interval '48 hours' and now() + interval '5 minutes' then p_ocurrio_en end
  );
end;
$$;
