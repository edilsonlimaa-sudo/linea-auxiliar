-- Pruebas de la cuenta de administración (migración 20261016130000_admin.sql).
-- No dependen del estado de la base (cuentas reales, contraseña del admin ya cambiada): crean su propio admin
-- (…02) y su propia pasajera dentro de la transacción, que se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- ---------- Creación del admin (como superusuario, igual que el registro de Supabase Auth) ----------
select public.crear_admin('prueba', 'admin123', '00000000-0000-4000-a000-000000000002');
select is(
  (select rol::text || '/' || estado::text || '/' || debe_cambiar_clave::text
     from public.perfiles where id = '00000000-0000-4000-a000-000000000002'),
  'admin/aprobado/true',
  'Un admin nuevo queda aprobado y obligado a cambiar la contraseña inicial');

select throws_ok($$
  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values (gen_random_uuid(), 'intruso@admin.lineaauxiliar.app', '{"rol": "admin", "nombre": "Intruso"}', '{}')
$$, 'P0001', 'Rol inválido: debe ser pasajero o chofer',
  'Nadie se hace admin con los datos del formulario de registro');

select lives_ok($$ select public.crear_admin('segundo', 'una-clave-segura') $$,
  'El servidor crea otro admin con crear_admin');
select is(
  (select p.rol::text || '/' || p.estado::text from public.perfiles p join auth.users u on u.id = p.id
    where u.email = 'segundo@admin.lineaauxiliar.app'),
  'admin/aprobado', 'El admin creado por el servidor queda aprobado');

-- Una pasajera para probar que el panel no es para ella (se deshace con la transacción)
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000021', 'authenticated', 'authenticated',
        public.correo_de_telefono('0414-0000021'), extensions.crypt('123456', extensions.gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"rol": "pasajero", "nombre": "María González", "urbanismo": "Valle Grande Country", "telefono": "0414-0000021"}', now(), now());

-- Para eliminar con historial: chofer Pedro ...31 y pasajero José ...32 (ambos rechazados) y chofera Yelitza ...33.
-- Viaje A de Pedro y viaje B de Yelitza, terminados; José viajó en los dos y calificó a Pedro.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', id::uuid, 'authenticated', 'authenticated', public.correo_de_telefono(tel),
       extensions.crypt('123456', extensions.gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}',
       datos::jsonb || jsonb_build_object('telefono', tel), now(), now()
  from (values
    ('00000000-0000-4000-a000-000000000031', '0414-0000031', '{"rol": "chofer", "nombre": "Pedro Guzmán", "placa": "AA111AA"}'),
    ('00000000-0000-4000-a000-000000000032', '0414-0000032', '{"rol": "pasajero", "nombre": "José Rodríguez"}'),
    ('00000000-0000-4000-a000-000000000033', '0414-0000033', '{"rol": "chofer", "nombre": "Yelitza Marín", "placa": "BB222BB"}')
  ) as c (id, tel, datos);
update public.perfiles set estado = 'rechazado'
 where id in ('00000000-0000-4000-a000-000000000031', '00000000-0000-4000-a000-000000000032');
update public.perfiles set estado = 'aprobado' where id = '00000000-0000-4000-a000-000000000033';
insert into public.viajes (id, chofer_id, sentido, puestos, estado) values
  ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-000000000031', 'vg_a_centro', 4, 'finalizado'),
  ('00000000-0000-4000-b000-00000000000b', '00000000-0000-4000-a000-000000000033', 'centro_a_vg', 4, 'finalizado');
insert into public.reservas (viaje_id, pasajero_id, estado, lugar) values
  ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-000000000032', 'subio', 'Portón VGC'),
  ('00000000-0000-4000-b000-00000000000b', '00000000-0000-4000-a000-000000000032', 'subio', 'Plaza Bolívar');
insert into public.calificaciones (viaje_id, chofer_id, pasajero_id, estrellas) values
  ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-a000-000000000031', '00000000-0000-4000-a000-000000000032', 5);

-- ---------- Panel ----------
set local role authenticated;

select throws_ok($$ select public.crear_admin('colado', 'una-clave-segura') $$, '42501', null,
  'Un usuario de la app no puede ejecutar crear_admin');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000021", "role": "authenticated"}', true);
select throws_ok($$ select * from public.admin_cuentas() $$, 'P0001', 'Solo para administración',
  'Un pasajero no puede ver el panel de cuentas');
select throws_ok($$ select public.clave_cambiada() $$, 'P0001', 'Solo para administración',
  'Un pasajero no puede usar las funciones de administración');
select throws_ok($$ select public.eliminar_cuenta('00000000-0000-4000-a000-000000000021') $$, 'P0001',
  'Solo el administrador puede eliminar cuentas', 'Un pasajero no puede eliminar cuentas');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}', true);
select ok(
  exists (select 1 from public.admin_cuentas('pendiente') where nombre = 'María González' and telefono = '+584140000021'),
  'El admin ve las cuentas pendientes con sus datos (un registro nuevo queda pendiente, R2)');

-- ---------- Eliminar una cuenta rechazada (R2) ----------
select throws_ok($$ select public.eliminar_cuenta('00000000-0000-4000-a000-000000000021') $$, 'P0001',
  'Solo se eliminan cuentas rechazadas', 'Una cuenta pendiente no se elimina: primero se rechaza');
select throws_ok($$ select public.eliminar_cuenta('00000000-0000-4000-a000-000000000002') $$, 'P0001',
  'Las cuentas de administración no se eliminan', 'El admin no se elimina a sí mismo');

select public.aprobar_cuenta('00000000-0000-4000-a000-000000000021', false);
select lives_ok($$ select public.eliminar_cuenta('00000000-0000-4000-a000-000000000021') $$,
  'El admin elimina una cuenta rechazada sin historial');
reset role;
select ok(
  not exists (select 1 from auth.users where id = '00000000-0000-4000-a000-000000000021')
    and not exists (select 1 from public.perfiles_privados where telefono = '+584140000021'),
  'Se borran el acceso y los datos: el teléfono queda libre para registrarse de nuevo');
set local role authenticated;

-- ---------- Eliminar con historial (R2) ----------
select throws_ok($$ select public.eliminar_cuenta('00000000-0000-4000-a000-000000000032') $$, 'P0001',
  'Tiene viajes en el historial: no se puede eliminar', 'Con historial, eliminar sin más no la borra');
select results_eq($$ select * from public.admin_historial('00000000-0000-4000-a000-000000000032') $$,
  $$ values (0, 2, 1) $$, 'El admin ve qué historial tiene antes de confirmar');
select lives_ok($$ select public.eliminar_cuenta('00000000-0000-4000-a000-000000000032', true) $$,
  'Con el segundo paso se elimina el pasajero con su historial');
select results_eq(
  $$ select pasajero_id, nombre, lugar from public.reservas where viaje_id = '00000000-0000-4000-b000-00000000000b' $$,
  $$ values (null::uuid, 'Cuenta eliminada'::text, null::text) $$,
  'Su reserva en el viaje de otra chofer queda como "Cuenta eliminada" (el viaje sigue contando el pasajero)');
select lives_ok($$ select public.eliminar_cuenta('00000000-0000-4000-a000-000000000031', true) $$,
  'Se elimina el chofer con sus viajes');
reset role;
select ok(
  not exists (select 1 from public.viajes where chofer_id = '00000000-0000-4000-a000-000000000031')
    and not exists (select 1 from public.calificaciones where chofer_id = '00000000-0000-4000-a000-000000000031')
    and not exists (select 1 from auth.users where id = '00000000-0000-4000-a000-000000000031')
    and exists (select 1 from public.viajes where id = '00000000-0000-4000-b000-00000000000b'),
  'Se van sus viajes y calificaciones; los viajes de otros choferes quedan');
set local role authenticated;

select public.clave_cambiada();
select is((select debe_cambiar_clave from public.perfiles where id = '00000000-0000-4000-a000-000000000002'), false,
  'Después de cambiar la contraseña, ya no se le exige');

select * from finish();
rollback;
