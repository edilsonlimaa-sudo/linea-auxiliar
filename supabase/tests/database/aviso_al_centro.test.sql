-- §5.8 R94: "Avísame cuando haya un carro al Centro": el pedido vale hasta la hora escogida y avisa una sola vez.
-- Cuentas propias (se deshacen al final): chofer real Raúl ...e1 · chofer de prueba Tomás ...e2 · pasajeras Ana ...e3
-- (con avisos en el celular) y Bea ...e4 (sin)
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

select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000e1', '0414-00000e1', '{"rol": "chofer", "nombre": "Raúl Real", "placa": "AV0E1AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000e2', '0414-00000e2', '{"rol": "chofer", "nombre": "Tomás Prueba", "placa": "AV0E2AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000e3', '0414-00000e3', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000e4', '0414-00000e4', '{"rol": "pasajero", "nombre": "Bea Díaz"}');
update public.perfiles set de_prueba = true where id = '00000000-0000-4000-a000-0000000000e2';
update public.cuota_config set activa = false where true;
create temp table mio (endpoint text);
grant select, insert on mio to authenticated;

set local role authenticated;

select pg_temp.yo('e3');
select throws_ok($$ select public.pedir_aviso('centro_a_vg', now() + interval '1 hour') $$,
  'P0001', 'Por ahora el aviso es solo para ir al Centro', 'R94: solo al Centro');
select throws_ok($$ select public.pedir_aviso('vg_a_centro', now() + interval '5 minutes') $$,
  'P0001', 'Escoge hasta cuándo te avisamos (entre 15 minutos y 12 horas)', 'R94: entre 15 min y 12 h');
select public.guardar_suscripcion('https://push.ejemplo/ana', 'clave', 'secreto');
select public.pedir_aviso('vg_a_centro', now() + interval '1 hour');
select public.pedir_aviso('vg_a_centro', now() + interval '2 hours');
select is((select count(*)::int from public.esperas where estado = 'esperando'), 1, 'R94: un pedido activo por persona (el nuevo reemplaza al anterior)');
select is((select lugar from public.esperas where estado = 'esperando'), null, 'R94: el pedido de aviso no pide el lugar');

select pg_temp.yo('e4');
select public.pedir_aviso('vg_a_centro', now() + interval '1 hour');
select is((select count(*)::int from public.esperas), 1, 'R94: cada una ve solo su pedido');
select throws_ok($$ select * from public.avisar_esperas() $$, 'P0001', null, 'R94: solo un chofer avisa (al publicar)');
select throws_ok($$ select * from public.esperando_para_choferes() $$, '42501', null, 'R31 sigue apagado: nadie lee quién espera');

-- El chofer de prueba no avisa a la gente real (R91)
select pg_temp.yo('e2');
select public.publicar_viaje('vg_a_centro', 4, 10);
select is((select count(*)::int from public.avisar_esperas()), 0, 'R94 + R91: el chofer de prueba no avisa a cuentas reales');

-- Un viaje con hora fija después de lo que pidieron no avisa; uno que llega ya, sí (Ana tiene celular, Bea no)
select pg_temp.yo('e1');
select public.publicar_viaje('vg_a_centro', 4, null, now() + interval '3 hours');
select is((select count(*)::int from public.avisar_esperas()), 0, 'R94: la hora fija después del pedido no avisa');
reset role;
update public.viajes set estado = 'cancelado' where chofer_id = '00000000-0000-4000-a000-0000000000e1';
set local role authenticated;
select pg_temp.yo('e1');
select public.publicar_viaje('vg_a_centro', 4, 10);
insert into mio select endpoint from public.avisar_esperas();
select is((select array_agg(endpoint) from mio), array['https://push.ejemplo/ana'], 'R94: avisa a los aparatos de quien pidió');
select is((select count(*)::int from public.avisar_esperas()), 0, 'R94: una sola vez por pedido');

reset role;
select is((select count(*)::int from public.esperas where pasajero_id in ('00000000-0000-4000-a000-0000000000e3', '00000000-0000-4000-a000-0000000000e4')
            and avisado_en is not null), 2, 'R94: quedan avisadas también las que no tienen el celular activado (lo ven en la app)');
update public.esperas set vence_en = now() - interval '1 minute' where pasajero_id = '00000000-0000-4000-a000-0000000000e4';
select public.vencer_esperas();
select is((select estado::text from public.esperas where pasajero_id = '00000000-0000-4000-a000-0000000000e4'), 'expirada',
  'R94: el pedido vence a la hora escogida');

select * from finish();
rollback;
