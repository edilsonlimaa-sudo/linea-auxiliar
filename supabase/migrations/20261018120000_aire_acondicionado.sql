-- =====================================================================================
-- Aire acondicionado del carro (R55). Las fotos (R54) ya tenían su lugar: bucket "fotos" y foto_path en
-- perfiles y vehiculos (migraciones esquema y storage_y_tareas).
-- =====================================================================================

alter table public.vehiculos add column aire_acondicionado boolean not null default false;
comment on column public.vehiculos.aire_acondicionado is 'El carro tiene aire acondicionado (R55): los pasajeros lo ven en cada unidad';

-- El chofer lo cambia en Mi carnet (la política "vehiculos: editar el propio" ya limita a su carro)
grant update (aire_acondicionado) on public.vehiculos to authenticated;

-- Al registrarse, el chofer también dice si tiene aire (metadato "aire" = "true")
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
    insert into public.vehiculos (chofer_id, unidad, placa, modelo, color, aire_acondicionado)
    values (new.id, nullif(trim(m ->> 'unidad'), ''), m ->> 'placa',
            nullif(trim(m ->> 'modelo'), ''), nullif(trim(m ->> 'color'), ''),
            coalesce(m ->> 'aire', '') = 'true');
  end if;

  return new;
end;
$$;

-- admin_cuentas devuelve también el aire, para verlo al aprobar (cambia el tipo de retorno: hay que recrearla)
drop function public.admin_cuentas(public.estado_cuenta);
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
  foto_carro_path text,
  aire_acondicionado boolean
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
    select p.id, p.rol, p.nombre, p.estado, p.creado_en, p.aprobado_en, p.urbanismo, p.foto_path,
           pp.telefono, pp.cedula, v.unidad, v.placa, v.modelo, v.color, v.foto_path, v.aire_acondicionado
      from public.perfiles p
      left join public.perfiles_privados pp on pp.id = p.id
      left join public.vehiculos v on v.chofer_id = p.id
     where p.rol <> 'admin' and (p_estado is null or p.estado = p_estado)
     order by p.creado_en desc;
end;
$$;
revoke execute on function public.admin_cuentas(public.estado_cuenta) from anon, public;
grant execute on function public.admin_cuentas(public.estado_cuenta) to authenticated;
