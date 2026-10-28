-- R4: PIN olvidado. El admin genera un PIN temporal (lo ve una vez y lo manda por WhatsApp); al entrar con él, la
-- persona escoge su PIN antes de ver cualquier otra pantalla. Se usa la misma marca que la contraseña inicial del admin
-- (perfiles.debe_cambiar_clave).

create function public.admin_restablecer_pin(p_persona uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_pin text;
begin
  if not public.es_admin() then raise exception 'Solo el administrador restablece el PIN'; end if;
  if not exists (select 1 from public.perfiles where id = p_persona and rol in ('pasajero', 'chofer')) then
    raise exception 'Esa cuenta no existe';
  end if;
  -- 6 números al azar (bytes criptográficos, no random())
  v_pin := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  update auth.users set encrypted_password = extensions.crypt(v_pin, extensions.gen_salt('bf')), updated_at = now()
   where id = p_persona;
  -- Quien tenía la sesión abierta (otro teléfono) queda fuera
  delete from auth.refresh_tokens where user_id = p_persona::text;
  delete from auth.sessions where user_id = p_persona;
  update public.perfiles set debe_cambiar_clave = true where id = p_persona;
  return v_pin;
end;
$$;
revoke execute on function public.admin_restablecer_pin(uuid) from anon, public;
grant execute on function public.admin_restablecer_pin(uuid) to authenticated;

-- La persona escoge su PIN (después del temporal): 6 números y distinto del que tiene
create function public.cambiar_mi_pin(p_nuevo text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_actual text;
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  if not exists (select 1 from public.perfiles where id = auth.uid() and rol in ('pasajero', 'chofer')) then
    raise exception 'Solo para pasajeros y choferes';
  end if;
  if coalesce(p_nuevo, '') !~ '^\d{6}$' then raise exception 'El PIN debe tener 6 números'; end if;
  select encrypted_password into v_actual from auth.users where id = auth.uid();
  if v_actual = extensions.crypt(p_nuevo, v_actual) then raise exception 'Escoge un PIN distinto al temporal'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_nuevo, extensions.gen_salt('bf')), updated_at = now()
   where id = auth.uid();
  update public.perfiles set debe_cambiar_clave = false where id = auth.uid();
end;
$$;
revoke execute on function public.cambiar_mi_pin(text) from anon, public;
grant execute on function public.cambiar_mi_pin(text) to authenticated;
