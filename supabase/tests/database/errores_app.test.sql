-- §5.27 Registro de errores (R106–R107): la app anota sus pantallas de error, con o sin sesión; recorta lo largo;
-- topes por persona; solo el admin lee.
-- Cuentas propias (se deshacen al final): admin ...0e · pasajera Eva ...e1
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select public.crear_admin('prueba-errores', 'una-clave-segura', '00000000-0000-4000-a000-00000000000e');
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-0000000000e1', 'authenticated', 'authenticated',
        public.correo_de_telefono('0414-00000e1'), extensions.crypt('123456', extensions.gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}', '{"rol": "pasajero", "nombre": "Eva Díaz", "telefono": "0414-00000e1"}', now(), now());
delete from public.errores_app; -- la prueba cuenta desde cero (se deshace al final)

-- Sin sesión (al entrar)
set local role anon;
select lives_ok($$ select public.registrar_error('nueva', 'red', '/', 'Failed to fetch', null, 'abc1234', 'Android', false, 12) $$,
  'R106: sin sesión se anota');
select lives_ok($$ select public.registrar_error('nueva', 'otro', '/n', repeat('x', 900)) $$,
  'R106: un mensaje larguísimo no falla');
select lives_ok($$ select public.registrar_error('marciana', 'otro', '/n', 'raro') $$,
  'R106: una interfaz desconocida no falla (se descarta)');
select throws_ok($$ select * from public.errores_app $$, '42501', null, 'R107: sin sesión no se lee');

-- Con sesión: queda quién; la hora del teléfono absurda no se guarda
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-0000000000e1", "role": "authenticated"}', true);
select lives_ok($$ select public.registrar_error('global', 'version', '/n/chofer', 'ChunkLoadError', 'd1g', null, null, true, null, '2001-01-01') $$,
  'R106: con sesión se anota');
select is((select count(*)::int from public.errores_app), 0, 'R107: una cuenta que no es admin no ve nada');
select lives_ok($$ select public.registrar_error('nueva', 'otro', '/n', 'error ' || g) from generate_series(1, 40) g $$,
  'R106: muchos seguidos no fallan');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-00000000000e", "role": "authenticated"}', true);
select is((select count(*)::int from public.errores_app where perfil_id = '00000000-0000-4000-a000-0000000000e1'), 30,
  'R106: cada persona como mucho 30 por hora');
select is((select count(*)::int from public.errores_app where perfil_id is null), 2, 'R106: los dos válidos sin sesión, sin el descartado');
select is((select char_length(mensaje) from public.errores_app where perfil_id is null and tipo = 'otro'), 500, 'R106: el mensaje se recorta a 500');
select is((select (ocurrio_en is null and digest = 'd1g' and en_linea) from public.errores_app where tipo = 'version'), true,
  'R106: guarda el código y la conexión; descarta una hora del teléfono absurda');

select * from finish();
rollback;
