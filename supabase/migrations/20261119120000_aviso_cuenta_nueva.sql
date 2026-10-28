-- §5.23 R93: al terminar de registrarse, el servidor (con la sesión de la cuenta nueva) pide los aparatos del admin para
-- avisarle que hay una cuenta por aprobar. Una sola vez por cuenta, solo pendiente y recién creada. Sin las claves VAPID
-- del servidor esos datos no sirven para mandar nada.

alter table public.perfiles add column aviso_admin_en timestamptz; -- cuándo se avisó al admin de esta cuenta (R93)

create function public.aviso_de_cuenta_nueva()
returns table (endpoint text, p256dh text, auth text) language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare p public.perfiles;
begin
  select * into p from public.perfiles where id = auth.uid();
  if p.id is null then raise exception 'Necesitas iniciar sesión'; end if;
  if p.rol not in ('pasajero', 'chofer') or p.estado <> 'pendiente' or p.aviso_admin_en is not null
     or p.creado_en < now() - interval '15 minutes' then
    return; -- nada que avisar: sin error, el registro sigue igual
  end if;
  update public.perfiles set aviso_admin_en = now() where id = p.id;
  return query
  select s.endpoint, s.p256dh, s.auth
    from public.push_suscripciones s
    join public.perfiles a on a.id = s.persona_id
   where a.rol = 'admin';
end;
$$;
revoke execute on function public.aviso_de_cuenta_nueva() from anon, public;
grant execute on function public.aviso_de_cuenta_nueva() to authenticated;
