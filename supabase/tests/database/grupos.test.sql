-- Pruebas de viajar acompañado (docs/especificacion.md R57). Se ejecutan con:  npx supabase test db
-- Crean sus propias cuentas dentro de la transacción, que se deshace al final.
--   chofer: Carlos ...41 · pasajeros: María ...51, José ...52, Carmen ...53, Ana ...54
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
end;
$$;
create function pg_temp.como(p_id text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;

select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000041', '0414-0000041', '{"rol": "chofer", "nombre": "Carlos Pérez", "placa": "GR111UP"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000051', '0414-0000051', '{"rol": "pasajero", "nombre": "María González"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000052', '0414-0000052', '{"rol": "pasajero", "nombre": "José Rodríguez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000053', '0414-0000053', '{"rol": "pasajero", "nombre": "Carmen Rivas"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000054', '0414-0000054', '{"rol": "pasajero", "nombre": "Ana Salazar"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now()
 where id in ('00000000-0000-4000-a000-000000000041', '00000000-0000-4000-a000-000000000051', '00000000-0000-4000-a000-000000000052',
              '00000000-0000-4000-a000-000000000053', '00000000-0000-4000-a000-000000000054');

set local role authenticated;

-- Carlos publica un viaje de 4 puestos
select pg_temp.como('00000000-0000-4000-a000-000000000041');
select set_config('t.v', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);

-- María va con dos acompañantes: ocupa los puestos 1 al 3
select pg_temp.como('00000000-0000-4000-a000-000000000051');
select lives_ok($$ select public.reservar(current_setting('t.v')::uuid, 'Portón VGC', null, null, 3) $$,
  'R57: se aparta para 3 personas si hay 3 puestos libres');
select is((select ocupados from public.viajes where id = current_setting('t.v')::uuid), 3,
  'R57: los puestos ocupados cuentan personas, no reservas');

-- José quiere ir con alguien más: solo queda 1 puesto
select pg_temp.como('00000000-0000-4000-a000-000000000052');
select throws_ok($$ select public.reservar(current_setting('t.v')::uuid, 'Eje VG', null, null, 2) $$,
  'P0001', 'Solo queda 1 puesto para 2 personas', 'R57: el grupo viaja junto: no se aparta para 2 con 1 puesto libre');
select lives_ok($$ select public.reservar(current_setting('t.v')::uuid, 'Eje VG') $$, 'Solo, José sí cabe');

-- Carmen sola, con el carro lleno: lista de espera. Ana con un acompañante: no se anota
select pg_temp.como('00000000-0000-4000-a000-000000000053');
select lives_ok($$ select public.reservar(current_setting('t.v')::uuid, 'Las Cayenas') $$, 'Sola, con el carro lleno, va a la lista de espera');
select pg_temp.como('00000000-0000-4000-a000-000000000054');
select throws_ok($$ select public.reservar(current_setting('t.v')::uuid, 'Calle 3', null, null, 2) $$,
  'P0001', 'Ese carro ya va lleno', 'R57: un grupo no se anota en la lista de espera');
select throws_ok($$ select public.reservar(current_setting('t.v')::uuid, 'Calle 3', null, null, 5) $$,
  'P0001', 'Pueden viajar de 1 a 4 personas por reserva', 'R57: de 1 a 4 personas por reserva');

select results_eq(
  $$ select nombre_corto, personas, desde, hasta, confirmado from public.lista_viaje(current_setting('t.v')::uuid) $$,
  $$ values ('María G.'::text, 3, 1, 3, true), ('José R.'::text, 1, 4, 4, true), ('Carmen R.'::text, 1, 5, 5, false) $$,
  'R57: la lista dice cuántos van y qué puestos ocupa cada uno, en orden de llegada');

-- Carlos baja a 3 puestos: María cabe entera; José pasa a la lista de espera
select pg_temp.como('00000000-0000-4000-a000-000000000041');
select public.cambiar_puestos(current_setting('t.v')::uuid, 3);
select results_eq(
  $$ select nombre_corto, confirmado from public.lista_viaje(current_setting('t.v')::uuid) $$,
  $$ values ('María G.'::text, true), ('José R.'::text, false), ('Carmen R.'::text, false) $$,
  'R17 + R57: al bajar los puestos, quien ya no cabe pasa a la lista de espera');

-- El chofer confirma a María y a José (R58); a Carmen no le responde
select public.responder_pedido(id, true) from public.reservas
 where viaje_id = current_setting('t.v')::uuid and pasajero_id in ('00000000-0000-4000-a000-000000000051', '00000000-0000-4000-a000-000000000052');
select is((select count(*)::int from public.reservas where viaje_id = current_setting('t.v')::uuid and pendiente), 1,
  'R58: la solicitud sin responder sigue pendiente (y guardando su puesto)');

-- Sale: suben los que tienen puesto (María y sus dos acompañantes); lo no respondido se rechaza
select public.avanzar_viaje(current_setting('t.v')::uuid, 'en_parada');
select public.avanzar_viaje(current_setting('t.v')::uuid, 'en_ruta');
select results_eq(
  $$ select personas, estado::text from public.reservas where viaje_id = current_setting('t.v')::uuid order by creado_en $$,
  $$ values (3, 'subio'), (1, 'sin_puesto'), (1, 'rechazada') $$,
  'R14 + R57 + R58: sube el grupo entero; la lista de espera queda sin puesto; lo no respondido se rechaza');

-- En el camino, sin puestos para el grupo: no se puede pedir
select pg_temp.como('00000000-0000-4000-a000-000000000054');
select throws_ok($$ select public.reservar(current_setting('t.v')::uuid, 'Calle 3', null, null, 2) $$,
  'P0001', 'Ese carro ya va lleno', 'R28 + R57: pedir en el camino también exige puestos para todos');

-- Sin respuesta en 5 minutos, la solicitud se rechaza sola (R58)
select pg_temp.como('00000000-0000-4000-a000-000000000041');
select set_config('t.v2', public.publicar_viaje('centro_a_vg', 4, 10)::text, true);
select pg_temp.como('00000000-0000-4000-a000-000000000054');
select set_config('t.r_ana', public.reservar(current_setting('t.v2')::uuid, 'Calle 3', null, null, 2)::text, true);
reset role;
update public.reservas set creado_en = now() - interval '6 minutes' where id = current_setting('t.r_ana')::uuid;
select public.vencer_pedidos();
select is((select estado::text from public.reservas where id = current_setting('t.r_ana')::uuid), 'rechazada',
  'R58: a los 5 minutos sin respuesta, la solicitud se rechaza sola');
select is((select ocupados from public.viajes where id = current_setting('t.v2')::uuid), 0,
  'R58: y sus puestos vuelven a quedar libres');
set local role authenticated;
select pg_temp.como('00000000-0000-4000-a000-000000000054');

-- La espera también dice cuántos van, y la demanda cuenta personas
select lives_ok($$ select public.marcar_espera('centro_a_vg', 'Calle 3', null, null, 2) $$, 'R57: se espera con cuántos van');
select ok(
  (select esperando from public.demanda_por_sentido() where sentido = 'centro_a_vg') >= 2,
  'R31 + R57: la demanda que ven los choferes cuenta personas');

select * from finish();
rollback;
