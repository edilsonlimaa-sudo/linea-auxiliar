-- =====================================================================================
-- Eliminar una cuenta rechazada (docs/especificacion.md R2).
-- Borra el usuario de auth.users: perfil, datos privados, vehículo y posición se van en cascada.
-- Solo si no dejó historial (viajes, reservas, calificaciones, alertas): eso pasa si estuvo aprobada antes.
-- =====================================================================================

create function public.eliminar_cuenta(p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_estado public.estado_cuenta;
  v_rol    public.rol_usuario;
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede eliminar cuentas'; end if;

  select estado, rol into v_estado, v_rol from public.perfiles where id = p_usuario for update;
  if not found then raise exception 'Esa cuenta no existe'; end if;
  if v_rol = 'admin' then raise exception 'Las cuentas de administración no se eliminan'; end if;
  if v_estado <> 'rechazado' then raise exception 'Solo se eliminan cuentas rechazadas'; end if;

  if exists (select 1 from public.viajes where chofer_id = p_usuario)
     or exists (select 1 from public.reservas where pasajero_id = p_usuario or agregada_por = p_usuario)
     or exists (select 1 from public.calificaciones where chofer_id = p_usuario or pasajero_id = p_usuario)
     or exists (select 1 from public.alertas where chofer_id = p_usuario)
     or exists (select 1 from public.alerta_apoyos where chofer_id = p_usuario) then
    raise exception 'Tiene viajes en el historial: no se puede eliminar';
  end if;

  -- Avisos de espera: no son historial
  delete from public.esperas where pasajero_id = p_usuario;
  delete from auth.users where id = p_usuario;
end;
$$;

revoke execute on function public.eliminar_cuenta(uuid) from anon, public;
grant execute on function public.eliminar_cuenta(uuid) to authenticated;

-- El admin borra las fotos de la cuenta que elimina (la carpeta es el id del usuario)
create policy "fotos: el admin borra" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and public.es_admin());
