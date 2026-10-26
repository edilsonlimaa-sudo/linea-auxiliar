-- Pruebas de las reglas de negocio (docs/especificacion.md). Se ejecutan con:  npx supabase test db
-- Crean sus propias cuentas (no dependen de datos de ejemplo). Todo corre en una transacción que se deshace
-- al final, así que no tocan la base de verdad.
--   admin ...01 (del seed) · choferes: Carlos ...11, Yelitza ...12
--   pasajeros: María ...21, José ...22, Carmen ...23, Ana (pendiente) ...24, Luis ...25, Daniela ...26
begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

-- Crea una cuenta como lo haría el registro: auth.users + identidad; el trigger crea el perfil.
create function pg_temp.crear_cuenta(p_id uuid, p_telefono text, p_datos jsonb)
returns void language plpgsql as $$
declare v_correo text := public.correo_de_telefono(p_telefono);
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', v_correo,
          extensions.crypt('123456', extensions.gen_salt('bf')), now(),
          '{"provider": "email", "providers": ["email"]}', p_datos || jsonb_build_object('telefono', p_telefono), now(), now());
end;
$$;
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000011', '0414-0000011', '{"rol": "chofer", "nombre": "Carlos Pérez", "placa": "AB123CD"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000012', '0414-0000012', '{"rol": "chofer", "nombre": "Yelitza Marín", "placa": "AF321JK", "aire": "true"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000021', '0414-0000021', '{"rol": "pasajero", "nombre": "María González", "urbanismo": "Valle Grande Country"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000022', '0414-0000022', '{"rol": "pasajero", "nombre": "José Rodríguez", "urbanismo": "Eje Valle Grande"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000023', '0414-0000023', '{"rol": "pasajero", "nombre": "Carmen Rivas", "urbanismo": "Valle Grande Country"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000024', '0414-0000024', '{"rol": "pasajero", "nombre": "Ana Salazar", "urbanismo": "Valle Grande Country"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000025', '0414-0000025', '{"rol": "pasajero", "nombre": "Luis Marcano", "urbanismo": "Centro de Maturín"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000026', '0414-0000026', '{"rol": "pasajero", "nombre": "Daniela Ortiz", "urbanismo": "Eje Valle Grande"}');
-- Aprobadas todas menos Ana, que queda pendiente para probar R2
update public.perfiles set estado = 'aprobado', aprobado_en = now()
 where rol <> 'admin' and id <> '00000000-0000-4000-a000-000000000024';

set local role authenticated;

-- ---------- Publicar (R10) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000011", "role": "authenticated"}', true);
select set_config('t.v1', public.publicar_viaje('vg_a_centro', 2, 10)::text, true);
select is((select estado::text from public.viajes where id = current_setting('t.v1')::uuid), 'en_camino',
  'R10: sin recogida previa, el viaje publicado queda en camino');

-- ---------- Cuentas (R2) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000024", "role": "authenticated"}', true);
select throws_ok($$ select public.reservar(current_setting('t.v1')::uuid, 'Portón VGC') $$,
  'P0001', 'Tu cuenta está en revisión. El administrador debe aprobarla primero',
  'R2: una cuenta pendiente no puede apartar');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000012", "role": "authenticated"}', true);
select throws_ok($$ select public.reservar(current_setting('t.v1')::uuid, 'Portón VGC') $$,
  'P0001', 'Solo los pasajeros pueden apartar puesto', 'Un chofer no puede apartar puesto');

-- ---------- Lista justa (R17, R20) y sin lista de espera (R59) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000021", "role": "authenticated"}', true);
select set_config('t.r_maria', public.reservar(current_setting('t.v1')::uuid, 'Portón VGC')::text, true);
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000022", "role": "authenticated"}', true);
select set_config('t.r_jose', public.reservar(current_setting('t.v1')::uuid, 'Eje VG')::text, true);
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000023", "role": "authenticated"}', true);
select throws_ok($$ select public.reservar(current_setting('t.v1')::uuid, 'Las Cayenas') $$,
  'P0001', 'Ese carro ya va lleno', 'R59: con el carro lleno no se aparta (no hay lista de espera)');

select results_eq(
  $$ select posicion, nombre_corto, confirmado from public.lista_viaje(current_setting('t.v1')::uuid) $$,
  $$ values (1, 'María G.'::text, true), (2, 'José R.'::text, true) $$,
  'R17: orden por hora de reserva');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000021", "role": "authenticated"}', true);
select lives_ok($$ select public.cancelar_reserva(current_setting('t.r_maria')::uuid) $$, 'R20: María libera su puesto');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000023", "role": "authenticated"}', true);
select set_config('t.r_carmen', public.reservar(current_setting('t.v1')::uuid, 'Las Cayenas')::text, true);
select results_eq(
  $$ select posicion, nombre_corto, confirmado from public.lista_viaje(current_setting('t.v1')::uuid) $$,
  $$ values (1, 'José R.'::text, true), (2, 'Carmen R.'::text, true) $$,
  'R20: el puesto liberado lo puede apartar otra persona');

-- ---------- Privacidad (§6) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000022", "role": "authenticated"}', true);
select is((select count(*)::int from public.perfiles_privados where id = '00000000-0000-4000-a000-000000000023'), 0,
  'Un pasajero no ve el teléfono de otro pasajero');
select is((select count(*)::int from public.reservas where pasajero_id = '00000000-0000-4000-a000-000000000023'), 0,
  'Un pasajero no ve las reservas (ni la ubicación) de otro');
select throws_ok($$ select cedula from public.perfiles_privados $$, '42501', null,
  'La cédula no se puede leer directo de la tabla');
select throws_ok($$ update public.viajes set puestos = 8 $$, '42501', null,
  'Nadie modifica viajes directo: solo con las funciones');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000011", "role": "authenticated"}', true);
select is((select telefono from public.perfiles_privados where id = '00000000-0000-4000-a000-000000000023'), '+584140000023',
  'El chofer ve el teléfono de quien tiene reserva en su viaje');

-- ---------- Salir (R14) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000026", "role": "authenticated"}', true);
select throws_ok($$ select public.reservar(current_setting('t.v1')::uuid, 'Portón VGC') $$,
  'P0001', 'Ese carro ya va lleno', 'R59: Daniela no se anota con el carro lleno');

-- Al apartar, el puesto queda garantizado: no hay que esperar al chofer (R58 eliminada)
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000011", "role": "authenticated"}', true);
select is((select pendiente from public.reservas where id = current_setting('t.r_carmen')::uuid), false,
  'R58 eliminada: al apartar, el puesto queda garantizado (no queda pendiente)');
select lives_ok($$ select public.avanzar_viaje(current_setting('t.v1')::uuid, 'en_parada') $$, 'Llegué');
select lives_ok($$ select public.avanzar_viaje(current_setting('t.v1')::uuid, 'en_ruta') $$, 'Salir');
select is((select estado::text from public.reservas where id = current_setting('t.r_jose')::uuid), 'subio',
  'R14: los confirmados suben al salir');
select is((select estado::text from public.reservas where id = current_setting('t.r_carmen')::uuid), 'subio',
  'R14: todos los que tienen puesto suben');

-- ---------- Pedido en el camino (R28–R29) y puestos manuales (R37–R38) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000025", "role": "authenticated"}', true);
select throws_ok($$ select public.reservar(current_setting('t.v1')::uuid, 'Plaza Bolívar') $$,
  'P0001', 'Ese carro ya va lleno', 'R28: no se pide a un carro en ruta que va lleno');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000011", "role": "authenticated"}', true);
select lives_ok($$ select public.marcar_se_bajo(current_setting('t.r_jose')::uuid) $$, 'R38: José se bajó y libera su puesto');
select is(
  (select r.estado::text || '/' || (r.cerrada_en is not null)::text || '/' || v.estado::text
     from public.reservas r join public.viajes v on v.id = r.viaje_id where r.id = current_setting('t.r_jose')::uuid),
  'bajo/true/en_ruta',
  'R38: para José el viaje terminó (con hora, para pedirle calificar, R45) aunque el carro siga en ruta');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000022", "role": "authenticated"}', true);
select lives_ok($$ insert into public.calificaciones (viaje_id, chofer_id, pasajero_id, estrellas)
                   values (current_setting('t.v1')::uuid, '00000000-0000-4000-a000-000000000011',
                           '00000000-0000-4000-a000-000000000022', 4) $$,
  'R44–R45: quien se bajó antes del final ya puede calificar');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000011", "role": "authenticated"}', true);

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000025", "role": "authenticated"}', true);
select throws_ok($$ select public.reservar(current_setting('t.v1')::uuid, '   ', 9.75, -63.18) $$,
  'P0001', 'Escribe dónde estás', 'R26: hace falta el lugar escrito; el GPS solo no basta');
select set_config('t.r_luis', public.reservar(current_setting('t.v1')::uuid, 'Plaza Bolívar')::text, true);
select is((select pendiente from public.reservas where id = current_setting('t.r_luis')::uuid), true,
  'R29: el pedido en el camino queda pendiente de respuesta del chofer');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000011", "role": "authenticated"}', true);
select lives_ok($$ select public.responder_pedido(current_setting('t.r_luis')::uuid, false) $$, 'R29: el chofer responde "Sigo"');
select is((select estado::text from public.reservas where id = current_setting('t.r_luis')::uuid), 'rechazada',
  'R29: el pedido rechazado se cierra');
select is((select ocupados from public.viajes where id = current_setting('t.v1')::uuid), 1,
  'R29: al rechazar, el puesto vuelve a quedar libre');

select lives_ok($$ select public.ocupar_puesto(current_setting('t.v1')::uuid, 'Sr. Ramón') $$,
  'R37: en ruta, ocupar puesto con lugar libre');
select is((select nombre_corto from public.lista_viaje(current_setting('t.v1')::uuid) order by posicion desc limit 1), 'Sr. Ramón',
  'R19: en la lista pública, el anotado a mano aparece con el nombre que puso el chofer');
select throws_ok($$ select public.ocupar_puesto(current_setting('t.v1')::uuid) $$,
  'P0001', 'Vas lleno. Si alguien se bajó, márcalo primero o sube los puestos',
  'R37: en ruta, no se ocupa puesto si va lleno');

-- ---------- Cadena de viajes (R11–R12) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000012", "role": "authenticated"}', true);
select set_config('t.va', public.publicar_viaje('centro_a_vg', 4, 5)::text, true);
select set_config('t.vb', public.publicar_viaje('vg_a_centro', 4, 25)::text, true);
select is((select estado::text from public.viajes where id = current_setting('t.vb')::uuid), 'programado',
  'R11: con una recogida en curso, el viaje nuevo queda como próximo viaje');
select is((select despues_de from public.viajes where id = current_setting('t.vb')::uuid), current_setting('t.va')::uuid,
  'R11: el próximo viaje se encadena detrás del anterior');
select public.avanzar_viaje(current_setting('t.va')::uuid, 'en_parada');
select public.avanzar_viaje(current_setting('t.va')::uuid, 'en_ruta');
select is((select estado::text from public.viajes where id = current_setting('t.vb')::uuid), 'en_camino',
  'R12: al salir de la recogida, el próximo viaje arranca solo');

-- ---------- Calificaciones (R44) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000023", "role": "authenticated"}', true);
select lives_ok($$ insert into public.calificaciones (viaje_id, chofer_id, pasajero_id, estrellas)
                   values (current_setting('t.v1')::uuid, '00000000-0000-4000-a000-000000000011',
                           '00000000-0000-4000-a000-000000000023', 5) $$,
  'R44: quien viajó puede calificar');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000026", "role": "authenticated"}', true);
select throws_ok($$ insert into public.calificaciones (viaje_id, chofer_id, pasajero_id, estrellas)
                    values (current_setting('t.v1')::uuid, '00000000-0000-4000-a000-000000000011',
                            '00000000-0000-4000-a000-000000000026', 1) $$,
  '42501', null, 'R44: quien no viajó no puede calificar');

-- ---------- Esperando (R31) y lugares recientes (R25) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000021", "role": "authenticated"}', true);
-- La base puede tener esperas reales: se mide cuánto sube la demanda, no el total
select set_config('t.demanda_antes', (select esperando from public.demanda_por_sentido() where sentido = 'centro_a_vg')::text, true);
select set_config('t.e_maria', public.marcar_espera('centro_a_vg', 'Frente a la farmacia')::text, true);
select results_eq($$ select lugar from public.mis_lugares_recientes() $$,
  $$ values ('Frente a la farmacia'::text), ('Portón VGC'::text) $$,
  'R25: los lugares recientes van del más nuevo al más viejo, sin repetir');

-- Un chofer sin relación con María: ve cuántos esperan, pero no quién ni dónde (R31, §6)
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000012", "role": "authenticated"}', true);
select is((select esperando from public.demanda_por_sentido() where sentido = 'centro_a_vg'), current_setting('t.demanda_antes')::int + 1,
  'R31: el chofer ve cuántos esperan en cada sentido');
select is((select count(*)::int from public.esperas), 0,
  'R31: el chofer no ve las esperas (lugar ni GPS) de los pasajeros');
select is((select count(*)::int from public.perfiles_privados where id = '00000000-0000-4000-a000-000000000021'), 0,
  '§6: esperar no expone el teléfono del pasajero a los choferes');

-- ---------- Aire acondicionado (R55) ----------
select is((select string_agg(aire_acondicionado::text, '/' order by placa) from public.vehiculos where placa in ('AB123CD', 'AF321JK')),
  'false/true', 'R55: al registrarse, el chofer dice si su carro tiene aire');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000011", "role": "authenticated"}', true);
update public.vehiculos set aire_acondicionado = true where chofer_id = '00000000-0000-4000-a000-000000000011';
update public.vehiculos set aire_acondicionado = false where chofer_id = '00000000-0000-4000-a000-000000000012';
select is((select string_agg(aire_acondicionado::text, '/' order by placa) from public.vehiculos where placa in ('AB123CD', 'AF321JK')),
  'true/true', 'R55: el chofer cambia el aire de su carro, pero no el de otro');

-- ---------- Aprobación (R2) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000022", "role": "authenticated"}', true);
select throws_ok($$ select public.aprobar_cuenta('00000000-0000-4000-a000-000000000024', true) $$,
  'P0001', 'Solo el administrador puede aprobar cuentas', 'R2: solo el admin aprueba cuentas');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000001", "role": "authenticated"}', true);
select lives_ok($$ select public.aprobar_cuenta('00000000-0000-4000-a000-000000000024', true) $$, 'R2: el admin aprueba a Ana');
select is((select estado::text from public.perfiles where id = '00000000-0000-4000-a000-000000000024'), 'aprobado',
  'R2: la cuenta queda aprobada');

select * from finish();
rollback;
