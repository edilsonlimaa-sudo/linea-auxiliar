-- =====================================================================================
-- Eliminar una cuenta rechazada también con su historial (docs/especificacion.md R2).
-- Sin p_con_historial se comporta como antes: si tiene historial, no la elimina.
-- =====================================================================================

-- Qué historial tiene una cuenta (para que el admin sepa qué se borra antes de confirmar)
create function public.admin_historial(p_usuario uuid)
returns table (viajes int, reservas int, calificaciones int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query select
    (select count(*)::int from public.viajes v where v.chofer_id = p_usuario),
    (select count(*)::int from public.reservas r where r.pasajero_id = p_usuario),
    (select count(*)::int from public.calificaciones c where c.chofer_id = p_usuario or c.pasajero_id = p_usuario);
end;
$$;

drop function public.eliminar_cuenta(uuid);

create function public.eliminar_cuenta(p_usuario uuid, p_con_historial boolean default false)
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

  if not p_con_historial and (
       exists (select 1 from public.viajes where chofer_id = p_usuario)
       or exists (select 1 from public.reservas where pasajero_id = p_usuario or agregada_por = p_usuario)
       or exists (select 1 from public.calificaciones where chofer_id = p_usuario or pasajero_id = p_usuario)
       or exists (select 1 from public.alertas where chofer_id = p_usuario)
       or exists (select 1 from public.alerta_apoyos where chofer_id = p_usuario)) then
    raise exception 'Tiene viajes en el historial: no se puede eliminar';
  end if;

  -- Calificaciones que dio o recibió, y las de sus viajes como chofer
  delete from public.calificaciones
   where chofer_id = p_usuario or pasajero_id = p_usuario
      or viaje_id in (select id from public.viajes where chofer_id = p_usuario);
  -- Sus viajes como chofer (sus reservas se van en cascada). Una sola sentencia: la cadena despues_de es entre ellos
  delete from public.viajes where chofer_id = p_usuario;
  -- Sus reservas en viajes de otros: quedan sin nombre real, para que esos choferes no pierdan la cuenta de pasajeros
  update public.reservas
     set pasajero_id = null, nombre = 'Cuenta eliminada', lugar = null, lat = null, lng = null
   where pasajero_id = p_usuario;
  update public.reservas set agregada_por = null where agregada_por = p_usuario;
  delete from public.alerta_apoyos where chofer_id = p_usuario;
  delete from public.alertas where chofer_id = p_usuario;
  delete from public.esperas where pasajero_id = p_usuario;

  delete from auth.users where id = p_usuario;
end;
$$;

revoke execute on function public.eliminar_cuenta(uuid, boolean), public.admin_historial(uuid) from anon, public;
grant execute on function public.eliminar_cuenta(uuid, boolean), public.admin_historial(uuid) to authenticated;
