-- R74: el Pago Móvil del chofer (banco, teléfono, cédula), para que el pasajero lo copie y pague sin preguntar.
-- Lleva la cédula: solo lo leen el propio chofer, el admin y, con pago_movil_de(), sus pasajeros del momento.

create table public.pago_movil (
  chofer_id uuid primary key references public.perfiles (id) on delete cascade,
  banco text not null check (banco ~ '^\d{4}$'),
  telefono text not null check (telefono ~ '^04\d{9}$'),
  cedula text not null check (cedula ~ '^[VEJGP]\d{6,9}$'),
  actualizado_en timestamptz not null default now()
);

alter table public.pago_movil enable row level security;
create policy "pago_movil: el propio o el admin" on public.pago_movil
  for select to authenticated using (chofer_id = auth.uid() or public.es_admin());
grant select on public.pago_movil to authenticated;

-- Guardar o cambiar el propio (solo choferes). Los datos ya vienen limpios de la app; aquí se vuelven a exigir
create function public.guardar_pago_movil(p_banco text, p_telefono text, p_cedula text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_chofer();
  if p_banco !~ '^\d{4}$' then raise exception 'Escoge tu banco'; end if;
  if p_telefono !~ '^04\d{9}$' then raise exception 'Escribe el teléfono del Pago Móvil, por ejemplo 0414-1234567'; end if;
  if p_cedula !~ '^[VEJGP]\d{6,9}$' then raise exception 'Escribe la cédula, por ejemplo V-12345678'; end if;
  insert into public.pago_movil (chofer_id, banco, telefono, cedula) values (auth.uid(), p_banco, p_telefono, p_cedula)
  on conflict (chofer_id) do update set banco = excluded.banco, telefono = excluded.telefono, cedula = excluded.cedula,
    actualizado_en = now();
end;
$$;

create function public.quitar_pago_movil()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_chofer();
  delete from public.pago_movil where chofer_id = auth.uid();
end;
$$;

-- El Pago Móvil de un chofer para quien puede verlo: el pasajero con reserva activa o a bordo en uno de sus viajes,
-- o que se bajó / llegó hace menos de 3 h; el propio chofer y el admin. Si no puede, o no lo registró: nada
create function public.pago_movil_de(p_chofer uuid)
returns table (banco text, telefono text, cedula text)
language sql stable security definer set search_path = '' as $$
  select pm.banco, pm.telefono, pm.cedula
    from public.pago_movil pm
   where pm.chofer_id = p_chofer
     and auth.uid() is not null
     and (
       p_chofer = auth.uid() or public.es_admin()
       or exists (
         select 1 from public.reservas r join public.viajes v on v.id = r.viaje_id
          where r.pasajero_id = auth.uid() and v.chofer_id = p_chofer
            and (
              (r.estado in ('activa', 'subio') and v.estado not in ('finalizado', 'cancelado'))
              or (r.estado = 'subio' and v.estado = 'finalizado' and v.llegada_en > now() - interval '3 hours')
              or (r.estado = 'bajo' and r.cerrada_en > now() - interval '3 hours')
            )
       )
     );
$$;

revoke execute on function public.guardar_pago_movil(text, text, text) from anon, public;
revoke execute on function public.quitar_pago_movil() from anon, public;
revoke execute on function public.pago_movil_de(uuid) from anon, public;
grant execute on function public.guardar_pago_movil(text, text, text) to authenticated;
grant execute on function public.quitar_pago_movil() to authenticated;
grant execute on function public.pago_movil_de(uuid) to authenticated;

-- En el registro (R1, R74): el chofer puede dejar su Pago Móvil de una vez. Viene en los metadatos; si algún dato no
-- es válido, no se guarda (la app ya lo valida) y lo registra después en Mi carnet. Igual que antes en lo demás.
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

    if coalesce(m ->> 'pm_banco', '') ~ '^\d{4}$' and coalesce(m ->> 'pm_telefono', '') ~ '^04\d{9}$'
       and coalesce(m ->> 'pm_cedula', '') ~ '^[VEJGP]\d{6,9}$' then
      insert into public.pago_movil (chofer_id, banco, telefono, cedula)
      values (new.id, m ->> 'pm_banco', m ->> 'pm_telefono', m ->> 'pm_cedula');
    end if;
  end if;

  return new;
end;
$$;
