-- R91: el chofer de prueba solo lo ven él, las cuentas de prueba y el admin, y no se cruza con la gente real.
-- Cuentas propias (se deshacen al final): chofer de prueba Tomás ...b1 · chofer real Raúl ...b2 · pasajera real Pía ...b3 ·
-- pasajera de prueba Quica ...b4
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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
create function pg_temp.plan(p_viaje text) returns text language sql as $$
  select string_agg(split_part(nombre, ' ', 1), ' ' order by posicion) from public.plan_de_gina(p_viaje::uuid);
$$;

select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000b1', '0414-00000b1', '{"rol": "chofer", "nombre": "Tomás Prueba", "placa": "TP001AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000b2', '0414-00000b2', '{"rol": "chofer", "nombre": "Raúl Real", "placa": "RR002AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000b3', '0414-00000b3', '{"rol": "pasajero", "nombre": "Pía Real"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000b4', '0414-00000b4', '{"rol": "pasajero", "nombre": "Quica Prueba"}');
update public.perfiles set de_prueba = true where id in ('00000000-0000-4000-a000-0000000000b1', '00000000-0000-4000-a000-0000000000b4');
-- Sin cuota, sin la lista ni carros de otros (todo se deshace al final)
update public.cuota_config set activa = false;
delete from public.lista_gina;
update public.viajes set estado = 'cancelado' where estado not in ('finalizado', 'cancelado');

set local role authenticated;

select pg_temp.yo('b1');
select set_config('t.tomas', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);
select is((select count(*)::int from public.viajes where id = current_setting('t.tomas')::uuid), 1, 'R91: el chofer de prueba ve su viaje');

select pg_temp.yo('b3');
select is((select count(*)::int from public.viajes where id = current_setting('t.tomas')::uuid), 0, 'R91: la pasajera real no ve el viaje del chofer de prueba');
select is((select count(*)::int from public.perfiles where id = '00000000-0000-4000-a000-0000000000b1'), 0, 'R91: ni su perfil');
select is((select count(*)::int from public.vehiculos where chofer_id = '00000000-0000-4000-a000-0000000000b1'), 0, 'R91: ni su carro');
select is((select count(*)::int from public.perfiles where id = '00000000-0000-4000-a000-0000000000b4'), 1, 'R91: la pasajera de prueba sí se ve');
select throws_ok($$ select public.reservar(current_setting('t.tomas')::uuid, 'Entrada') $$,
  'P0001', 'Ese viaje ya no está disponible', 'R91: nadie real aparta en el viaje del chofer de prueba');

select pg_temp.yo('b2');
select is((select count(*)::int from public.viajes where id = current_setting('t.tomas')::uuid), 0, 'R91: el chofer real tampoco lo ve (compañeros)');

select pg_temp.yo('b4');
select is((select count(*)::int from public.viajes where id = current_setting('t.tomas')::uuid), 1, 'R91: la pasajera de prueba ve el viaje de prueba');
select lives_ok($$ select public.reservar(current_setting('t.tomas')::uuid, 'Entrada') $$, 'R91: y aparta en él');
select public.cancelar_reserva((select id from public.reservas where pasajero_id = '00000000-0000-4000-a000-0000000000b4' and estado = 'activa'));

-- Lista hacia Valle Grande: Pía (real) y Quica (prueba) esperan en Gina
select pg_temp.yo('b3');
select public.estoy_en_lista(true);
select pg_temp.yo('b4');
select public.estoy_en_lista(true);

select pg_temp.yo('b1');
select public.cancelar_viaje(current_setting('t.tomas')::uuid);
select set_config('t.tomas_vg', public.publicar_viaje('centro_a_vg', 4, 0)::text, true);
select is((select string_agg(split_part(nombre, ' ', 1), ' ' order by posicion) from public.lista_para_choferes()), 'Quica',
  'R91: el chofer de prueba solo ve a los pasajeros de prueba en la lista');
select is(pg_temp.plan(current_setting('t.tomas_vg')), 'Quica', 'R91: y su plan en Gina solo los llama a ellos');
select throws_ok($$ select public.no_estaba_en_lista((select id from public.lista_gina where pasajero_id = '00000000-0000-4000-a000-0000000000b3' and estado = 'esperando')) $$,
  'P0001', 'Esa persona ya no está en la lista', 'R91: no puede marcar "No estaba" a una pasajera real');

select pg_temp.yo('b2');
select set_config('t.raul', public.publicar_viaje('centro_a_vg', 4, 0)::text, true);
select is((select string_agg(split_part(nombre, ' ', 1), ' ' order by posicion) from public.lista_para_choferes()), 'Pía Quica',
  'R91: el chofer real ve a todos, también a la pasajera de prueba');
select is(pg_temp.plan(current_setting('t.raul')), 'Pía Quica', 'R91: el carro de prueba que llegó antes a Gina no le quita a nadie');

-- Pausa: Tomás termina por hoy
select pg_temp.yo('b1');
select public.desconectar();
select pg_temp.yo('b3');
select is((select count(*)::int from public.choferes_en_pausa() where chofer_id = '00000000-0000-4000-a000-0000000000b1'), 0,
  'R91: la pausa del chofer de prueba no aparece');
select pg_temp.yo('b4');
select is((select count(*)::int from public.choferes_en_pausa() where chofer_id = '00000000-0000-4000-a000-0000000000b1'), 1,
  'R91: a la cuenta de prueba sí');

select * from finish();
rollback;
