-- Pruebas de la cuenta de administración (migración 20261016130000_admin.sql).
-- No dependen del estado de la base (cuentas reales, contraseña del admin ya cambiada): crean su propio admin
-- (…02) y su propia pasajera dentro de la transacción, que se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

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
    ('00000000-0000-4000-a000-000000000033', '0414-0000033', '{"rol": "chofer", "nombre": "Yelitza Marín", "placa": "BB222BB"}'),
    ('00000000-0000-4000-a000-000000000034', '0414-0000034', '{"rol": "pasajero", "nombre": "Ana Salazar"}')
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

-- Viaje C de Yelitza para el cronómetro (R56): se publica en camino y pasa por recogiendo y en ruta
insert into public.viajes (id, chofer_id, sentido, puestos, estado, eta_min) values
  ('00000000-0000-4000-b000-00000000000c', '00000000-0000-4000-a000-000000000033', 'vg_a_centro', 4, 'en_camino', 10);
update public.viajes set estado = 'en_parada' where id = '00000000-0000-4000-b000-00000000000c';
update public.viajes set puestos = 3 where id = '00000000-0000-4000-b000-00000000000c'; -- sin cambio de estado: no cuenta
update public.viajes set estado = 'en_ruta' where id = '00000000-0000-4000-b000-00000000000c';

-- Uso de la app: viajes D y E de Yelitza terminados hoy. Ana aparta en D y pide en el camino en E;
-- en D además va una señora anotada a mano (R36)
insert into public.viajes (id, chofer_id, sentido, puestos, estado, llegada_en) values
  ('00000000-0000-4000-b000-00000000000d', '00000000-0000-4000-a000-000000000033', 'vg_a_centro', 4, 'finalizado', now()),
  ('00000000-0000-4000-b000-00000000000e', '00000000-0000-4000-a000-000000000033', 'centro_a_vg', 4, 'finalizado', now());
insert into public.reservas (viaje_id, pasajero_id, nombre, estado, en_camino, lugar) values
  ('00000000-0000-4000-b000-00000000000d', '00000000-0000-4000-a000-000000000034', null, 'subio', false, 'Portón VGC'),
  ('00000000-0000-4000-b000-00000000000d', null, 'Señora Carmen', 'subio', false, null),
  ('00000000-0000-4000-b000-00000000000e', '00000000-0000-4000-a000-000000000034', null, 'bajo', true, 'Plaza Bolívar');

-- María espera para ir al Centro (para la Demanda del panel)
insert into public.esperas (pasajero_id, sentido, lugar)
values ('00000000-0000-4000-a000-000000000021', 'vg_a_centro', 'Portón VGC');
-- Ana también espera al Centro; José, a Valle Grande (para "También esperan", §8 Esperando)
insert into public.esperas (pasajero_id, sentido, lugar) values
  ('00000000-0000-4000-a000-000000000034', 'vg_a_centro', 'Calle 3'),
  ('00000000-0000-4000-a000-000000000032', 'centro_a_vg', 'Plaza Bolívar');

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

-- ---------- Cronómetro del viaje (R56) ----------
select is(
  (select array_agg(estado::text || '/' || coalesce(eta_min, 0) order by id) from public.viaje_eventos
    where viaje_id = '00000000-0000-4000-b000-00000000000c'),
  array['en_camino/10', 'en_parada/10', 'en_ruta/10'],
  'R56: cada cambio de estado queda con su hora y lo prometido (y nada más)');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000033", "role": "authenticated"}', true);
select is((select count(*)::int from public.viaje_eventos), 0, 'R56: un chofer no lee el cronómetro, ni el de sus viajes');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}', true);
select ok((select count(*) from public.viaje_eventos) >= 3, 'R56: el admin lee el cronómetro');

-- ---------- Uso de la app (§8, Resumen punto 5) ----------
select results_eq(
  $$ select app, en_camino, a_mano from public.admin_uso_por_chofer(now() - interval '7 days')
      where chofer_id = '00000000-0000-4000-a000-000000000033' $$,
  $$ values (1, 1, 1) $$,
  'Uso: por chofer, cuántos entraron por la app, por la app en el camino y anotados a mano');
select results_eq(
  $$ select nombre, viajes from public.admin_uso_pasajeros(now() - interval '7 days')
      where pasajero_id in ('00000000-0000-4000-a000-000000000034', '00000000-0000-4000-a000-000000000032') $$,
  $$ values ('Ana Salazar'::text, 2) $$,
  'Uso: pasajeros identificados que viajaron y cuántas veces (los anotados a mano no cuentan)');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000033", "role": "authenticated"}', true);
select throws_ok($$ select * from public.admin_uso_pasajeros(now()) $$, 'P0001', 'Solo para administración',
  'Un chofer no ve el uso de la app');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}', true);

-- ---------- También esperan (§8 Esperando, §6) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000034", "role": "authenticated"}', true);
select results_eq(
  $$ select nombre_corto, soy_yo from public.esperan_conmigo() $$,
  $$ values ('María G.'::text, false), ('Ana S.'::text, true) $$,
  'Quien espera ve a los que esperan en su mismo sentido, con nombre corto (no los del otro sentido)');
select is(
  pg_get_function_result('public.esperan_conmigo()'::regprocedure),
  'TABLE(nombre_corto text, personas integer, desde timestamp with time zone, soy_yo boolean)',
  '§6: nombre corto, cuántos van y desde cuándo; nunca el lugar ni el teléfono');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000033", "role": "authenticated"}', true);
select is((select count(*)::int from public.esperan_conmigo()), 0, 'Sin espera propia no se ve a nadie');

-- Quién espera, para los choferes (R31, §6): Yelitza (...33) desconectada no ve a nadie; conectada, sí y con teléfono
select is((select count(*)::int from public.esperando_para_choferes()), 0, 'R31: el chofer desconectado no ve quién espera');
reset role;
update public.perfiles set conectado_en = now() where id = '00000000-0000-4000-a000-000000000033';
set local role authenticated;
select ok(
  exists (select 1 from public.esperando_para_choferes()
           where nombre = 'Ana S.' and lugar = 'Calle 3' and telefono = '+584140000034' and sentido = 'vg_a_centro'),
  'R31: el chofer conectado ve quién espera, dónde y su teléfono (para escribirle por WhatsApp)');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000034", "role": "authenticated"}', true);
select throws_ok('select * from public.esperando_para_choferes()', 'P0001', 'Solo para choferes',
  'R31: un pasajero no ve la lista de quién espera');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000033", "role": "authenticated"}', true);
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}', true);

-- ---------- Demanda (§8) ----------
select ok(
  exists (select 1 from public.admin_demanda()
           where nombre = 'María González' and telefono = '+584140000021' and lugar = 'Portón VGC' and sentido = 'vg_a_centro'),
  'El admin ve quién espera, hacia dónde, dónde y su teléfono');
select is((select pedidos >= 1 from public.admin_demanda_hoy()), true, 'El admin ve los pedidos de hoy');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000021", "role": "authenticated"}', true);
select throws_ok(
  'select * from public.admin_demanda()', 'P0001', 'Solo para administración',
  'Un pasajero no ve quién más espera (R31, §6)');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}', true);

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

-- ---------- Resumen del panel (§8) ----------
select lives_ok($$ select * from public.admin_resumen() $$, 'El admin ve el resumen de la línea');
select is((select viajes from public.admin_actividad() where id = '00000000-0000-4000-a000-000000000033'), 3,
  'La actividad cuenta los viajes terminados de cada chofer');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000033", "role": "authenticated"}', true);
select throws_ok($$ select * from public.admin_actividad() $$, 'P0001', 'Solo para administración',
  'Un chofer no ve la actividad de las cuentas');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}', true);

select public.clave_cambiada();
select is((select debe_cambiar_clave from public.perfiles where id = '00000000-0000-4000-a000-000000000002'), false,
  'Después de cambiar la contraseña, ya no se le exige');

select * from finish();
rollback;
