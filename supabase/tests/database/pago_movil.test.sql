-- R74: el Pago Móvil del chofer. Cuentas propias (se deshacen al final): chofer Raúl ...36, chofer Lía ...37
-- (se registra con Pago Móvil), pasajeros Ana ...78 (con reserva) y Beto ...79 (sin reserva)
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create function pg_temp.crear_cuenta(p_id uuid, p_telefono text, p_datos jsonb)
returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', public.correo_de_telefono(p_telefono),
          extensions.crypt('123456', extensions.gen_salt('bf')), now(),
          '{"provider": "email", "providers": ["email"]}', p_datos || jsonb_build_object('telefono', p_telefono), now(), now());
end;
$$;
create function pg_temp.yo(p text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-0000000000' || p, 'role', 'authenticated')::text, true);
$$;

select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000036', '0414-0000036', '{"rol": "chofer", "nombre": "Raúl Paz", "placa": "RP036AA"}');
-- Registro con Pago Móvil (lo guarda el trigger)
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000037', '0414-0000037',
  '{"rol": "chofer", "nombre": "Lía Gil", "placa": "LG037AA", "pm_banco": "0134", "pm_telefono": "04140000037", "pm_cedula": "V12345678"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000078', '0414-0000078', '{"rol": "pasajero", "nombre": "Ana Luz"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000079', '0414-0000079', '{"rol": "pasajero", "nombre": "Beto Sol"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now()
 where id in ('00000000-0000-4000-a000-000000000036', '00000000-0000-4000-a000-000000000037',
              '00000000-0000-4000-a000-000000000078', '00000000-0000-4000-a000-000000000079');

select results_eq($$ select banco, telefono, cedula from public.pago_movil where chofer_id = '00000000-0000-4000-a000-000000000037' $$,
  $$ values ('0134'::text, '04140000037'::text, 'V12345678'::text) $$, 'R74: el registro guarda el Pago Móvil');

set local role authenticated;
select pg_temp.yo('36');
select throws_ok($$ select public.guardar_pago_movil('12', '04140000036', 'V11111111') $$, 'P0001', 'Escoge tu banco', 'R74: banco de 4 dígitos');
select throws_ok($$ select public.guardar_pago_movil('0102', '1234', 'V11111111') $$, 'P0001',
  'Escribe el teléfono del Pago Móvil, por ejemplo 0414-1234567', 'R74: teléfono válido');
select lives_ok($$ select public.guardar_pago_movil('0102', '04140000036', 'V11111111') $$, 'R74: el chofer guarda su Pago Móvil');
select lives_ok($$ select public.guardar_pago_movil('0105', '04140000036', 'V11111111') $$, 'R74: y lo cambia');

-- Ana aparta en un viaje de Raúl: ve su Pago Móvil; Beto, sin reserva, no
select set_config('t.v', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);
select pg_temp.yo('78');
select public.reservar(current_setting('t.v')::uuid, 'Plaza', null, null, 1);
select results_eq($$ select banco from public.pago_movil_de('00000000-0000-4000-a000-000000000036') $$,
  $$ values ('0105'::text) $$, 'R74: el pasajero con reserva lo ve');
select is_empty($$ select * from public.pago_movil where chofer_id = '00000000-0000-4000-a000-000000000036' $$,
  'R74: la tabla no se lee directo (lleva la cédula)');
select pg_temp.yo('79');
select is_empty($$ select * from public.pago_movil_de('00000000-0000-4000-a000-000000000036') $$, 'R74: sin reserva, nada');

-- Un pasajero no guarda Pago Móvil; el chofer lo quita
select throws_ok($$ select public.guardar_pago_movil('0102', '04140000079', 'V22222222') $$, 'P0001',
  'Solo los choferes pueden hacer esto', 'R74: solo choferes');
select pg_temp.yo('36');
select public.quitar_pago_movil();
reset role;
select is((select count(*)::int from public.pago_movil where chofer_id = '00000000-0000-4000-a000-000000000036'), 0, 'R74: lo quita');

select * from finish();
rollback;
