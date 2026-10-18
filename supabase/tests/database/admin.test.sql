-- Pruebas de la cuenta de administración (migración 20261016130000_admin.sql).
-- No dependen del estado de la base (cuentas reales, contraseña del admin ya cambiada): crean su propio admin
-- (…02) y su propia pasajera dentro de la transacción, que se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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

-- ---------- Panel ----------
set local role authenticated;

select throws_ok($$ select public.crear_admin('colado', 'una-clave-segura') $$, '42501', null,
  'Un usuario de la app no puede ejecutar crear_admin');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000021", "role": "authenticated"}', true);
select throws_ok($$ select * from public.admin_cuentas() $$, 'P0001', 'Solo para administración',
  'Un pasajero no puede ver el panel de cuentas');
select throws_ok($$ select public.clave_cambiada() $$, 'P0001', 'Solo para administración',
  'Un pasajero no puede usar las funciones de administración');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000002", "role": "authenticated"}', true);
select ok(
  exists (select 1 from public.admin_cuentas('pendiente') where nombre = 'María González' and telefono = '+584140000021'),
  'El admin ve las cuentas pendientes con sus datos (un registro nuevo queda pendiente, R2)');

select public.clave_cambiada();
select is((select debe_cambiar_clave from public.perfiles where id = '00000000-0000-4000-a000-000000000002'), false,
  'Después de cambiar la contraseña, ya no se le exige');

select * from finish();
rollback;
