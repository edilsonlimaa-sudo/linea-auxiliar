-- §5.23 Notificaciones (R88–R89): el admin las manda a los pasajeros de la interfaz nueva; cada uno ve las suyas.
-- Cuentas propias (se deshacen al final): admin ...08 · pasajeras Ana ...b1 y Bea ...b2 (nueva), Rosa ...b3 (clásica)
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

create function pg_temp.crear_cuenta(p_id uuid, p_telefono text, p_datos jsonb)
returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', public.correo_de_telefono(p_telefono),
          extensions.crypt('123456', extensions.gen_salt('bf')), now(),
          '{"provider": "email", "providers": ["email"]}', p_datos || jsonb_build_object('telefono', p_telefono), now(), now());
  update public.perfiles set estado = 'aprobado', aprobado_en = now() where id = p_id;
end;
$$;
create function pg_temp.yo(p text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-0000000000' || p, 'role', 'authenticated')::text, true);
$$;

select public.crear_admin('prueba-notif', 'una-clave-segura', '00000000-0000-4000-a000-000000000008');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000b1', '0414-00000b1', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000b2', '0414-00000b2', '{"rol": "pasajero", "nombre": "Bea Díaz"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000b3', '0414-00000b3', '{"rol": "pasajero", "nombre": "Rosa Tovar"}');
update public.perfiles set interfaz = 'nueva'
 where id in ('00000000-0000-4000-a000-0000000000b1', '00000000-0000-4000-a000-0000000000b2');
-- Para contar solo las de esta prueba, sin importar quién más esté en la nueva en esta base
create temp table antes as select count(*) n from public.perfiles where rol = 'pasajero' and estado = 'aprobado' and interfaz = 'nueva';
grant select on antes to authenticated;

set local role authenticated;

select pg_temp.yo('b1');
select throws_ok($$ select public.admin_enviar_notificacion('aviso', 'Hola', 'Texto') $$,
  'P0001', 'Solo el administrador manda notificaciones', 'R88: solo el admin manda notificaciones');

select pg_temp.yo('08');
select throws_ok($$ select public.admin_enviar_notificacion('aviso', '   ', 'Texto') $$, 'P0001', 'Escribe el título', 'R88: el título es obligatorio');
select throws_ok($$ select public.admin_enviar_notificacion('aviso', 'Hola', repeat('a', 281)) $$,
  'P0001', 'El texto es muy largo (máximo 280 letras)', 'R88: el texto tiene un máximo');
select is((select destinatarios from public.admin_enviar_notificacion('aviso', 'Llueve fuerte', 'Hoy salen menos carros después de las 5 p. m.')),
  (select n::int from antes), 'R88: a todos los pasajeros de la nueva');
select is((select destinatarios from public.admin_enviar_notificacion('consejo', 'Sigo aquí', 'En la lista de Gina, toca Sigo aquí para no perder tu puesto.',
  array['00000000-0000-4000-a000-0000000000b2', '00000000-0000-4000-a000-0000000000b3']::uuid[])), 1,
  'R88: a personas escogidas, solo las de la nueva (Rosa está en la clásica)');
select throws_ok($$ select public.admin_enviar_notificacion('novedad', 'Hola', 'Texto', array['00000000-0000-4000-a000-0000000000b3']::uuid[]) $$,
  'P0001', 'Nadie recibiría esta notificación: escoge pasajeros de la interfaz nueva', 'R88: sin destinatarios no se manda');

select pg_temp.yo('b1');
select is((select count(*)::int from public.notificaciones), 1, 'R89: Ana ve solo la que le llegó');
select pg_temp.yo('b3');
select is((select count(*)::int from public.notificaciones), 0, 'R89: Rosa, en la clásica, no recibió ninguna');
select pg_temp.yo('b2');
select is((select count(*)::int from public.notificacion_destinos where leida_en is null), 2, 'R89: Bea tiene 2 sin leer');
select is(public.marcar_notificaciones_leidas(), 2, 'R89: al abrir la pestaña quedan leídas');
select is((select count(*)::int from public.notificacion_destinos where leida_en is null), 0, 'R89: y ya no hay sin leer');

select pg_temp.yo('08');
select is((select vistas || ' de ' || destinatarios from public.admin_notificaciones() where titulo = 'Sigo aquí'), '1 de 1',
  'R88: el admin ve cuántos la vieron');
select public.admin_retirar_notificacion((select id from public.notificaciones where titulo = 'Llueve fuerte'));
select pg_temp.yo('b1');
select is((select count(*)::int from public.notificaciones), 0, 'R88: retirada, ya no la ve nadie');

select * from finish();
rollback;
