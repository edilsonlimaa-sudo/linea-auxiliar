-- §5.24 Rutas nuevas (R96–R97): cualquiera registra su interés sin cuenta; el mismo teléfono no se duplica; solo el admin lee.
-- Cuentas propias (se deshacen al final): admin ...09 · pasajera Ana ...c1
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

select public.crear_admin('prueba-interes', 'una-clave-segura', '00000000-0000-4000-a000-000000000009');
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-0000000000c1', 'authenticated', 'authenticated',
        public.correo_de_telefono('0414-00000c1'), extensions.crypt('123456', extensions.gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}', '{"rol": "pasajero", "nombre": "Ana Pérez", "telefono": "0414-00000c1"}', now(), now());

-- Sin sesión (la página pública)
set local role anon;
select lives_ok($$ select public.registrar_interes('faro', 'pasajero', '  María   López ', '0424-555 12 34', 'Faro 3', array['temprano','tarde'], '3-4', null, 'Salgo a las 6') $$,
  'R96: sin cuenta se registra un pasajero');
select lives_ok($$ select public.registrar_interes('faro', 'chofer', 'Luis Rojas', '04125550000', 'Faro 7', array['manana'], null, 'Aveo gris', null) $$,
  'R96: y un chofer');
select throws_ok($$ select public.registrar_interes('faro', 'pasajero', 'Pedro Gil', '1234', 'Faro 1') $$,
  'P0001', 'Escribe tu número de WhatsApp, por ejemplo 0414-1234567', 'R96: el WhatsApp tiene que ser un celular venezolano');
select throws_ok($$ select public.registrar_interes('valle', 'pasajero', 'Pedro Gil', '04145550000', 'Faro 1') $$,
  'P0001', 'Esa ruta no existe', 'R96: solo rutas conocidas');
select throws_ok($$ select public.registrar_interes('faro', 'pasajero', 'Pedro Gil', '04145550000', ' ') $$,
  'P0001', 'Escribe en qué microcondominio vives', 'R96: el microcondominio es obligatorio');
select throws_ok($$ select public.registrar_interes('faro', 'pasajero', 'Pedro Gil', '04145550000', 'Faro 1', array['madrugada']) $$,
  'P0001', 'Horario desconocido', 'R96: solo las franjas conocidas');
select throws_ok($$ select * from public.interesados $$, '42501', null, 'R97: quien envía no puede leer la tabla');
select throws_ok($$ select * from public.admin_interesados('faro') $$, '42501', null, 'R97: anon no llama la función del admin');

-- El mismo teléfono vuelve a enviar: se actualiza, no se duplica
select lives_ok($$ select public.registrar_interes('faro', 'pasajero', 'María López', '+58 424 5551234', 'Faro 3 (torre B)', array['noche'], 'casi_todos') $$,
  'R96: un segundo envío del mismo teléfono');

-- Una cuenta que no es admin tampoco los ve
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-0000000000c1", "role": "authenticated"}', true);
select throws_ok($$ select * from public.admin_interesados('faro') $$, 'P0001', 'Solo el administrador ve los interesados', 'R97: solo el admin');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000009", "role": "authenticated"}', true);
select is((select count(*)::int from public.admin_interesados('faro') where telefono in ('+584245551234', '+584125550000')), 2,
  'R97: el admin ve dos personas (sin duplicar a María)');
select is((select sector || ' · ' || array_to_string(horarios, ',') || ' · ' || frecuencia || ' · ' || coalesce(comentario, '') from public.admin_interesados('faro') where telefono = '+584245551234'),
  'Faro 3 (torre B) · noche · casi_todos · Salgo a las 6', 'R96: el reenvío actualiza sus datos y conserva el comentario');

select * from finish();
rollback;
