-- R117: los choferes ven quién pidió "Avísame" al Centro; el teléfono solo conectados; el pasajero no lo ve.
-- Cuentas propias (se deshacen al final): chofer Raúl ...d1 · chofer de prueba Tomás ...d2 · pasajeras Ana ...d3 y Bea ...d4
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

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

select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d1', '0414-00000d1', '{"rol": "chofer", "nombre": "Raúl Real", "placa": "AV0D1AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d2', '0414-00000d2', '{"rol": "chofer", "nombre": "Tomás Prueba", "placa": "AV0D2AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d3', '0414-00000d3', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d4', '0414-00000d4', '{"rol": "pasajero", "nombre": "Bea Díaz"}');
update public.perfiles set de_prueba = true where id = '00000000-0000-4000-a000-0000000000d2';
update public.cuota_config set activa = false where true;
-- Sin otros pedidos en esta transacción (la base local puede tener datos reales; todo se deshace al final)
update public.esperas set estado = 'cancelada' where estado = 'esperando';

set local role authenticated;

select pg_temp.yo('d3');
select public.pedir_aviso('vg_a_centro', now() + interval '2 hours');
select pg_temp.yo('d4');
select public.pedir_aviso('vg_a_centro', now() + interval '2 hours');

select throws_ok($$ select * from public.pedidos_al_centro() $$, 'P0001', null, 'R117: el pasajero no ve quién pidió');

-- Raúl sin conectarse: ve a las dos, sin teléfono
select pg_temp.yo('d1');
select is((select string_agg(nombre, ', ' order by pedido_en) from public.pedidos_al_centro()), 'Ana P., Bea D.',
  'R117: el chofer ve quién pidió, en orden');
select is((select count(*)::int from public.pedidos_al_centro() where telefono is not null), 0, 'R117: sin conectarse, sin teléfono (§6)');

-- Conectado: con teléfono
select public.conectar();
select is((select count(*)::int from public.pedidos_al_centro() where telefono is not null), 2, 'R117: conectado, con teléfono');

-- El chofer de prueba no ve a la gente real (R91)
select pg_temp.yo('d2');
select is((select count(*)::int from public.pedidos_al_centro()), 0, 'R117 + R91: el chofer de prueba no ve pedidos reales');

-- Ya avisada sigue en la lista (puede no haber conseguido puesto), marcada
select pg_temp.yo('d1');
select public.publicar_viaje('vg_a_centro', 4, 10);
select count(*) from public.avisar_esperas();
select is((select count(*)::int from public.pedidos_al_centro() where avisado_en is not null), 2, 'R117: se ve a quién ya se le avisó');

-- Vencido, ya no aparece
reset role;
update public.esperas set vence_en = now() - interval '1 minute' where pasajero_id = '00000000-0000-4000-a000-0000000000d4';
set local role authenticated;
select pg_temp.yo('d1');
select is((select count(*)::int from public.pedidos_al_centro()), 1, 'R117: el pedido vencido no aparece');

select * from finish();
rollback;
