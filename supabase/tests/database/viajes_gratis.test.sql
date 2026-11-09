-- §5.26 Viajes gratis (R102–R105). Cuentas propias (se deshacen al final): admin ...0a · chofer Gil ...d1 ·
-- pasajera Lía ...d2 · pasajero Tomás ...d3
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

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

select public.crear_admin('prueba-gratis', 'una-clave-segura', '00000000-0000-4000-a000-00000000000a');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d1', '0414-00000d1', '{"rol": "chofer", "nombre": "Gil Mora", "placa": "GM001AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d2', '0414-00000d2', '{"rol": "pasajero", "nombre": "Lía Soto"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d3', '0414-00000d3', '{"rol": "pasajero", "nombre": "Tomás Rey"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now()
 where id in ('00000000-0000-4000-a000-0000000000d1', '00000000-0000-4000-a000-0000000000d2', '00000000-0000-4000-a000-0000000000d3');

set local role authenticated;

-- R102: solo el admin regala
select pg_temp.yo('d2');
select throws_ok($$ select public.admin_regalar_viajes('00000000-0000-4000-a000-0000000000d2', 3, 'Me lo regalo') $$,
  'P0001', 'Solo el administrador regala viajes', 'R102: el pasajero no se regala viajes');
select pg_temp.yo('0a');
select throws_ok($$ select public.admin_regalar_viajes('00000000-0000-4000-a000-0000000000d1', 1, 'Premio') $$,
  'P0001', 'Solo se regalan viajes a pasajeros', 'R102: solo a pasajeros');
select throws_ok($$ select public.admin_regalar_viajes('00000000-0000-4000-a000-0000000000d2', 11, 'Premio') $$,
  'P0001', 'Escoge entre 1 y 10 viajes', 'R102: de 1 a 10');
select set_config('t.g', public.admin_regalar_viajes('00000000-0000-4000-a000-0000000000d2', 2, 'Premio de la semana 3')::text, true);
select is(public.admin_saldo_gratis('00000000-0000-4000-a000-0000000000d2'), 2, 'R102: el admin ve que le quedan 2');

-- Lía ve los suyos; Tomás no ve los de Lía
select pg_temp.yo('d2');
select is(public.mis_viajes_gratis(), 2, 'R103: la pasajera ve que tiene 2');
select pg_temp.yo('d3');
select is((select count(*)::int from public.viajes_gratis), 0, '§6: otro pasajero no ve los regalos ajenos');

-- Gil publica; Lía y Tomás apartan
select pg_temp.yo('d1');
select set_config('t.v', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);
select pg_temp.yo('d2');
select set_config('t.r', public.reservar(current_setting('t.v')::uuid, 'La bodega', null, null, 2)::text, true);
select pg_temp.yo('d3');
select set_config('t.r3', public.reservar(current_setting('t.v')::uuid, 'La plaza')::text, true);
select throws_ok(format($$ select public.usar_viaje_gratis('%s') $$, current_setting('t.r')), 'P0001',
  'No encontramos tu reserva', 'R103: solo en su propia reserva');

-- R103: antes de subir no se puede pagar con el viaje gratis
select pg_temp.yo('d2');
select throws_ok(format($$ select public.usar_viaje_gratis('%s') $$, current_setting('t.r')), 'P0001',
  'Podrás pagar con tu viaje gratis cuando vayas a bordo', 'R103: solo a bordo');

-- Gil llega, sale: Lía va a bordo y paga con su viaje gratis (una vez, aunque toque dos veces; en grupo, solo uno)
reset role;
update public.viajes set estado = 'en_parada', estado_en = now() where id = current_setting('t.v')::uuid;
set local role authenticated;
select pg_temp.yo('d1');
select public.avanzar_viaje(current_setting('t.v')::uuid, 'en_ruta');
select pg_temp.yo('d3');
select throws_ok(format($$ select public.usar_viaje_gratis('%s') $$, current_setting('t.r3')), 'P0001',
  'No te quedan viajes gratis', 'R103: sin regalos no hay viaje gratis');
select pg_temp.yo('d2');
select lives_ok(format($$ select public.usar_viaje_gratis('%s') $$, current_setting('t.r')), 'R103: a bordo paga con un viaje gratis');
select public.usar_viaje_gratis(current_setting('t.r')::uuid);
select is(public.mis_viajes_gratis(), 1, 'R103: uno por reserva, aunque toque dos veces (y en grupo, solo uno)');

-- R105: el chofer ve que pagó así
select pg_temp.yo('d1');
select is((select gratis from public.reservas where id = current_setting('t.r')::uuid), true, 'R105: el chofer ve la marca');

-- R102: un regalo ya usado no se quita
select pg_temp.yo('0a');
select throws_ok(format($$ select public.admin_quitar_regalo('%s') $$, current_setting('t.g')), 'P0001',
  'Ya usó parte de esos viajes: no se puede quitar', 'R102: no se quita lo que ya se usó');

-- R104: viaja y termina: queda gastado
select pg_temp.yo('d1');
select public.avanzar_viaje(current_setting('t.v')::uuid, 'finalizado');
select pg_temp.yo('d2');
select is(public.mis_viajes_gratis(), 1, 'R104: el viaje hecho queda gastado');
select pg_temp.yo('d3');
select throws_ok(format($$ select public.usar_viaje_gratis('%s') $$, current_setting('t.r3')), 'P0001',
  'Este viaje ya terminó', 'R103: después de terminar ya no se paga así');

-- R104: hacia Valle Grande, subió en Gina, pagó con su viaje gratis y el viaje se cancela antes de salir: vuelve
select pg_temp.yo('d1');
select set_config('t.v2', public.publicar_viaje('centro_a_vg', 4, 10)::text, true);
reset role;
update public.viajes set estado = 'en_parada', estado_en = now() where id = current_setting('t.v2')::uuid;
insert into public.reservas (viaje_id, pasajero_id, estado, lugar)
values (current_setting('t.v2')::uuid, '00000000-0000-4000-a000-0000000000d2', 'subio', 'Gina');
set local role authenticated;
select pg_temp.yo('d2');
select public.usar_viaje_gratis((select id from public.reservas where viaje_id = current_setting('t.v2')::uuid));
select is(public.mis_viajes_gratis(), 0, 'R103: hacia Valle Grande también, a bordo');
select pg_temp.yo('d1');
select public.cancelar_viaje(current_setting('t.v2')::uuid);
select pg_temp.yo('d2');
select is(public.mis_viajes_gratis(), 1, 'R104: el viaje cancelado lo devuelve');

-- R102: un regalo sin usar se puede quitar
select pg_temp.yo('0a');
select set_config('t.g2', public.admin_regalar_viajes('00000000-0000-4000-a000-0000000000d3', 1, 'Por error')::text, true);
select lives_ok(format($$ select public.admin_quitar_regalo('%s') $$, current_setting('t.g2')), 'R102: se quita un regalo mal puesto');

select * from finish();
rollback;
