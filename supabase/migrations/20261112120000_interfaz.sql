-- §5.21 Interfaz nueva (R83–R85): cada cuenta ve la clásica (por defecto) o la nueva. Solo el admin la cambia: la
-- columna no está en los grant de update de perfiles (solo nombre, urbanismo y foto_path).

alter table public.perfiles add column interfaz text not null default 'clasica' check (interfaz in ('clasica', 'nueva'));
comment on column public.perfiles.interfaz is 'R83: la interfaz que ve la cuenta (clasica o nueva). Solo la cambia el admin.';

-- La propia (para que la app la lleve a su interfaz, R84)
create function public.mi_interfaz()
returns text language sql stable security definer set search_path = '' as $$
  select interfaz from public.perfiles where id = auth.uid()
$$;
revoke execute on function public.mi_interfaz() from anon, public;
grant execute on function public.mi_interfaz() to authenticated;

-- R83: el admin la cambia a una o varias cuentas de pasajeros o choferes; devuelve cuántas cambiaron
create function public.admin_cambiar_interfaz(p_ids uuid[], p_interfaz text)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not public.es_admin() then raise exception 'Solo el administrador cambia la interfaz'; end if;
  if p_interfaz is null or p_interfaz not in ('clasica', 'nueva') then raise exception 'Interfaz desconocida'; end if;
  update public.perfiles set interfaz = p_interfaz
   where id = any (coalesce(p_ids, '{}')) and rol in ('pasajero', 'chofer') and interfaz <> p_interfaz;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function public.admin_cambiar_interfaz(uuid[], text) from anon, public;
grant execute on function public.admin_cambiar_interfaz(uuid[], text) to authenticated;
