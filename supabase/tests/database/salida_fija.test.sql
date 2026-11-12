-- R88 botón de la notificación · §5.28 R108–R109 la encuesta de la salida fija.
-- Cuentas propias (se deshacen al final): admin ...09 · pasajeras Ana ...c1 y Bea ...c2 (nueva) · chofer Juan ...c3
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

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

select public.crear_admin('prueba-salida', 'una-clave-segura', '00000000-0000-4000-a000-000000000009');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000c1', '0414-0000901', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000c2', '0414-0000902', '{"rol": "pasajero", "nombre": "Bea Díaz"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000c3', '0414-0000903',
  '{"rol": "chofer", "nombre": "Juan Rojas", "placa": "AB123CD", "unidad": "1", "modelo": "Aveo", "color": "Gris"}');
update public.perfiles set interfaz = 'nueva'
 where id in ('00000000-0000-4000-a000-0000000000c1', '00000000-0000-4000-a000-0000000000c2');

set local role authenticated;

-- ——— R88: el botón ———
select pg_temp.yo('09');
select throws_ok($$ select public.admin_enviar_notificacion('novedad', 'Hola', 'Texto', array['00000000-0000-4000-a000-0000000000c1']::uuid[], 'Ir', null) $$,
  'P0001', 'El botón necesita su texto y a dónde lleva', 'R88: el botón lleva texto y destino');
select throws_ok($$ select public.admin_enviar_notificacion('novedad', 'Hola', 'Texto', array['00000000-0000-4000-a000-0000000000c1']::uuid[], 'Ir', 'https://otra.com') $$,
  'P0001', 'El botón solo puede llevar a una pantalla de la app', 'R88: nunca un enlace de afuera');
select throws_ok($$ select public.admin_enviar_notificacion('novedad', 'Hola', 'Texto', array['00000000-0000-4000-a000-0000000000c1']::uuid[], repeat('a', 25), '/n/salida-fija') $$,
  'P0001', 'El texto del botón es muy largo (máximo 24 letras)', 'R88: el texto del botón tiene un máximo');
select is((select destinatarios from public.admin_enviar_notificacion('novedad', '¿Vuelves a las 5?', 'Queremos probar una salida fija.',
  array['00000000-0000-4000-a000-0000000000c1', '00000000-0000-4000-a000-0000000000c2']::uuid[], 'Quiero mi puesto', '/n/salida-fija')), 2,
  'R88: con botón se manda igual');
select is((select boton_texto || ' → ' || boton_destino from public.admin_notificaciones() where titulo = '¿Vuelves a las 5?'),
  'Quiero mi puesto → /n/salida-fija', 'R88: el admin ve el botón');

select pg_temp.yo('c1');
select is((select boton_destino from public.notificaciones where titulo = '¿Vuelves a las 5?'), '/n/salida-fija', 'R88: la pasajera ve a dónde lleva');
select is(public.marcar_leidas_de_destino('/n/al-centro'), 0, 'R88: abrir otra pantalla no la marca');
select is(public.marcar_leidas_de_destino('/n/salida-fija'), 1, 'R88: abrir el destino cuenta como vista');
select is((select count(*)::int from public.notificacion_destinos where leida_en is null), 0, 'R88: y ya no está sin leer');

-- ——— R108: responder ———
select throws_ok($$ select public.responder_salida_fija('si', null, null, array[1, 2]::smallint[]) $$,
  'P0001', 'Escoge a qué hora te sirve', 'R108: con "sí" pide la hora');
select throws_ok($$ select public.responder_salida_fija('si', 'otra', '  ', array[1]::smallint[]) $$,
  'P0001', 'Escribe a qué hora te sirve', 'R108: "Otra hora" pide escribirla');
select throws_ok($$ select public.responder_salida_fija('luego', '17:15', null, array[6, 7]::smallint[]) $$,
  'P0001', 'Escoge al menos un día', 'R108: solo de lunes a viernes, al menos uno');
select public.responder_salida_fija('si', '17:15', 'ignorada', array[5, 1, 1, 3]::smallint[], 'Salgo a las 5 en punto');
select is((select horario || ' ' || dias::text || ' ' || coalesce(horario_otro, '-') from public.salida_fija_respuestas),
  '17:15 {1,3,5} -', 'R108: guarda la hora y los días (sin repetir, en orden)');
select public.responder_salida_fija('no', '17:45', null, array[2]::smallint[]);
select is((select compromiso || ' ' || coalesce(horario, '-') || ' ' || coalesce(dias::text, '-') from public.salida_fija_respuestas),
  'no - -', 'R108: una sola respuesta, que se cambia; "No me sirve" no guarda hora ni días');

select pg_temp.yo('c2');
select public.responder_salida_fija('si', 'otra', '6:15 p. m.', array[1, 2, 3, 4, 5]::smallint[]);
select is((select count(*)::int from public.salida_fija_respuestas), 1, 'R108: cada una ve solo la suya');

select pg_temp.yo('c3');
select throws_ok($$ select public.responder_salida_fija('si', '17:15', null, array[1]::smallint[]) $$,
  'P0001', 'Solo los pasajeros con la cuenta aprobada pueden responder', 'R108: solo pasajeros');

-- ——— R109: el admin ———
select pg_temp.yo('c1');
select throws_ok($$ select * from public.admin_salida_fija() $$, 'P0001', 'Solo el administrador ve las respuestas', 'R109: solo el admin las ve todas');
select pg_temp.yo('09');
select is((select count(*)::int from public.admin_salida_fija() where persona_id in ('00000000-0000-4000-a000-0000000000c1', '00000000-0000-4000-a000-0000000000c2')),
  2, 'R109: el admin ve las dos');
select ok((select telefono like '%0000902' from public.admin_salida_fija() where persona_id = '00000000-0000-4000-a000-0000000000c2'),
  'R109: con el teléfono para escribirle');

select * from finish();
rollback;
