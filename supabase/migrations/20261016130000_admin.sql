-- =====================================================================================
-- Administración: cuenta de admin separada (usuario + contraseña) y panel de aprobación.
--   · El admin NO se crea con el registro de la app. Solo con crear_admin(), que únicamente puede
--     ejecutar el servidor con la clave secreta (rol service_role): seed y npm run admin:crear.
--   · La cuenta de admin no tiene teléfono; entra por /admin/entrar con usuario + contraseña.
--   · Queda con debe_cambiar_clave = true: el panel obliga a cambiar la contraseña inicial.
-- =====================================================================================

alter table public.perfiles add column debe_cambiar_clave boolean not null default false;

-- Registro: igual que antes, más el caso del admin (app_metadata.rol = 'admin', que solo fija crear_admin)
create or replace function public.crear_perfil_nuevo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_rol    public.rol_usuario;
  v_tel    text := public.normalizar_telefono(m ->> 'telefono');
begin
  if coalesce(new.raw_app_meta_data ->> 'rol', '') = 'admin' then
    insert into public.perfiles (id, rol, nombre, estado, aprobado_en, debe_cambiar_clave)
    values (new.id, 'admin', coalesce(nullif(trim(m ->> 'nombre'), ''), 'Administración'), 'aprobado', now(), true);
    return new;
  end if;

  if coalesce(m ->> 'rol', '') not in ('pasajero', 'chofer') then
    raise exception 'Rol inválido: debe ser pasajero o chofer';
  end if;
  v_rol := (m ->> 'rol')::public.rol_usuario;

  if new.email is distinct from public.correo_de_telefono(m ->> 'telefono') then
    raise exception 'El correo interno no corresponde al teléfono';
  end if;

  insert into public.perfiles (id, rol, nombre, urbanismo)
  values (new.id, v_rol, trim(m ->> 'nombre'), nullif(trim(m ->> 'urbanismo'), ''));

  insert into public.perfiles_privados (id, telefono, cedula)
  values (new.id, v_tel, nullif(trim(m ->> 'cedula'), ''));

  if v_rol = 'chofer' then
    if coalesce(trim(m ->> 'placa'), '') = '' then
      raise exception 'La placa es obligatoria para choferes';
    end if;
    insert into public.vehiculos (chofer_id, unidad, placa, modelo, color)
    values (new.id, nullif(trim(m ->> 'unidad'), ''), m ->> 'placa',
            nullif(trim(m ->> 'modelo'), ''), nullif(trim(m ->> 'color'), ''));
  end if;

  return new;
end;
$$;

-- Crea la cuenta de admin en un solo paso (usuario → correo interno usuario@admin.lineaauxiliar.app).
-- Escribe en auth.users igual que Supabase Auth (contraseña con bcrypt) y su identidad de correo.
-- Solo para el servidor: no se concede a anon ni a authenticated.
-- p_id solo lo usa el seed (id fijo para las pruebas)
create function public.crear_admin(p_usuario text, p_clave text, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id      uuid := coalesce(p_id, gen_random_uuid());
  v_usuario text := lower(trim(coalesce(p_usuario, '')));
  v_correo  text;
begin
  if v_usuario !~ '^[a-z0-9._-]{3,30}$' then
    raise exception 'Usuario inválido: 3 a 30 letras minúsculas, números, punto, guion o guion bajo';
  end if;
  if char_length(coalesce(p_clave, '')) < 8 then
    raise exception 'La contraseña debe tener al menos 8 caracteres';
  end if;
  v_correo := v_usuario || '@admin.lineaauxiliar.app';
  if exists (select 1 from auth.users where email = v_correo) then
    raise exception 'Ya existe un admin con el usuario %', v_usuario;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_correo,
    extensions.crypt(p_clave, extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"], "rol": "admin"}', '{"nombre": "Administración"}',
    now(), now(), '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', v_correo, 'email_verified', true),
          'email', now(), now(), now());
  return v_id;
end;
$$;

-- El admin ya cambió la contraseña inicial
create function public.clave_cambiada()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  update public.perfiles set debe_cambiar_clave = false where id = auth.uid();
end;
$$;

-- Cuentas para el panel: todos los datos que el admin necesita para verificar identidad (R2, R5)
create function public.admin_cuentas(p_estado public.estado_cuenta default null)
returns table (
  id uuid,
  rol public.rol_usuario,
  nombre text,
  estado public.estado_cuenta,
  creado_en timestamptz,
  aprobado_en timestamptz,
  urbanismo text,
  foto_path text,
  telefono text,
  cedula text,
  unidad text,
  placa text,
  modelo text,
  color text,
  foto_carro_path text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
    select p.id, p.rol, p.nombre, p.estado, p.creado_en, p.aprobado_en, p.urbanismo, p.foto_path,
           pp.telefono, pp.cedula, v.unidad, v.placa, v.modelo, v.color, v.foto_path
      from public.perfiles p
      left join public.perfiles_privados pp on pp.id = p.id
      left join public.vehiculos v on v.chofer_id = p.id
     where p.rol <> 'admin' and (p_estado is null or p.estado = p_estado)
     order by p.creado_en desc;
end;
$$;

revoke execute on function public.clave_cambiada(), public.admin_cuentas(public.estado_cuenta) from anon, public;
grant execute on function public.clave_cambiada(), public.admin_cuentas(public.estado_cuenta) to authenticated;
-- crear_admin: solo el servidor (clave secreta = service_role)
revoke execute on function public.crear_admin(text, text, uuid) from anon, public, authenticated;
grant execute on function public.crear_admin(text, text, uuid) to service_role;
