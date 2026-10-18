-- =====================================================================================
-- Datos de EJEMPLO para desarrollo local: choferes, pasajeros, viajes, calificaciones y un aviso.
-- Se cargan a mano sobre una base recién creada:  npm run db:reset && npm run db:demo
-- Pasajeros y choferes: PIN 123456. Nunca cargar esto en producción.
-- =====================================================================================

-- Crea una cuenta como lo haría el registro: auth.users + identidad; el trigger crea el perfil.
create function pg_temp.crear_cuenta(p_id uuid, p_telefono text, p_datos jsonb)
returns void language plpgsql as $$
declare v_correo text := public.correo_de_telefono(p_telefono);
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', v_correo,
    extensions.crypt('123456', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', p_datos || jsonb_build_object('telefono', p_telefono),
    now(), now(), '', '', '', '', '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text,
          jsonb_build_object('sub', p_id::text, 'email', v_correo, 'email_verified', true),
          'email', now(), now(), now());
end;
$$;

-- Ids fijos (…11 choferes, …21 pasajeros) para referirse a cada persona
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000011', '0414-0000011', '{"rol": "chofer", "nombre": "Carlos Pérez", "unidad": "07", "placa": "AB123CD", "modelo": "Chevrolet Aveo", "color": "Gris"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000012', '0414-0000012', '{"rol": "chofer", "nombre": "Yelitza Marín", "unidad": "03", "placa": "AF321JK", "modelo": "Hyundai Accent", "color": "Azul"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000013', '0414-0000013', '{"rol": "chofer", "nombre": "Ramón Figuera", "unidad": "15", "placa": "AD789GH", "modelo": "Ford Fiesta", "color": "Rojo", "cedula": "V-15333444"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000021', '0414-0000021', '{"rol": "pasajero", "nombre": "María González", "urbanismo": "Valle Grande Country"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000022', '0414-0000022', '{"rol": "pasajero", "nombre": "José Rodríguez", "urbanismo": "Eje Valle Grande"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000023', '0414-0000023', '{"rol": "pasajero", "nombre": "Carmen Rivas", "urbanismo": "Valle Grande Country", "cedula": "V-20111222"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000024', '0414-0000024', '{"rol": "pasajero", "nombre": "Ana Salazar", "urbanismo": "Valle Grande Country"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000025', '0414-0000025', '{"rol": "pasajero", "nombre": "Luis Marcano", "urbanismo": "Centro de Maturín"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000026', '0414-0000026', '{"rol": "pasajero", "nombre": "Daniela Ortiz", "urbanismo": "Eje Valle Grande"}');

-- Aprobadas: todas menos Ramón (chofer) y Ana (pasajera), que quedan pendientes para probar la aprobación
update public.perfiles
   set estado = 'aprobado', aprobado_en = now(), aprobado_por = '00000000-0000-4000-a000-000000000001'
 where rol <> 'admin' and id not in ('00000000-0000-4000-a000-000000000013', '00000000-0000-4000-a000-000000000024');

-- =====================================================================================
-- Movimiento de ejemplo para ver el Inicio con contenido. Usa cuentas propias (choferes 14–16 y
-- pasajeros 27–31) para no tocar las que usan las pruebas. María (…21) queda libre para probar.
-- =====================================================================================
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000014', '0414-0000014', '{"rol": "chofer", "nombre": "Pedro Guzmán", "unidad": "11", "placa": "AC456EF", "modelo": "Toyota Corolla", "color": "Blanco"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000015', '0414-0000015', '{"rol": "chofer", "nombre": "Gabriel Rondón", "unidad": "05", "placa": "AE987LM", "modelo": "Chevrolet Optra", "color": "Negro"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000016', '0414-0000016', '{"rol": "chofer", "nombre": "Nelson Bello", "unidad": "09", "placa": "AG654NP", "modelo": "Renault Logan", "color": "Plateado"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000027', '0414-0000027', '{"rol": "pasajero", "nombre": "Rosa Méndez", "urbanismo": "Valle Grande Country"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000028', '0414-0000028', '{"rol": "pasajero", "nombre": "Héctor Silva", "urbanismo": "Eje Valle Grande"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000029', '0414-0000029', '{"rol": "pasajero", "nombre": "Gladys Acosta", "urbanismo": "Valle Grande Country"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000030', '0414-0000030', '{"rol": "pasajero", "nombre": "Jesús Lara", "urbanismo": "Eje Valle Grande"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000031', '0414-0000031', '{"rol": "pasajero", "nombre": "Luisa Fermín", "urbanismo": "Centro de Maturín"}');

update public.perfiles
   set estado = 'aprobado', aprobado_en = now(), aprobado_por = '00000000-0000-4000-a000-000000000001'
 where id in ('00000000-0000-4000-a000-000000000014', '00000000-0000-4000-a000-000000000015',
              '00000000-0000-4000-a000-000000000016', '00000000-0000-4000-a000-000000000027',
              '00000000-0000-4000-a000-000000000028', '00000000-0000-4000-a000-000000000029',
              '00000000-0000-4000-a000-000000000030', '00000000-0000-4000-a000-000000000031');
update public.perfiles set conectado_en = now() - interval '1 hour'
 where id in ('00000000-0000-4000-a000-000000000014', '00000000-0000-4000-a000-000000000015', '00000000-0000-4000-a000-000000000016');

insert into public.viajes (id, chofer_id, sentido, puestos, eta_min, estado, despues_de, estado_en, salida_en, llegada_en, creado_en) values
  -- Viajes de ayer, terminados, para tener calificaciones
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000014', 'vg_a_centro', 4, 10, 'finalizado', null,
   now() - interval '1 day', now() - interval '1 day 20 min', now() - interval '1 day', now() - interval '1 day 1 hour'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000015', 'vg_a_centro', 4, 10, 'finalizado', null,
   now() - interval '1 day', now() - interval '1 day 20 min', now() - interval '1 day', now() - interval '1 day 1 hour'),
  -- Pedro viene en camino a Valle Grande (llega en ~8 min) y después vuelve del Centro
  ('00000000-0000-4000-b000-000000000011', '00000000-0000-4000-a000-000000000014', 'vg_a_centro', 4, 10, 'en_camino', null,
   now() - interval '2 min', null, null, now() - interval '20 min'),
  ('00000000-0000-4000-b000-000000000012', '00000000-0000-4000-a000-000000000014', 'centro_a_vg', 4, 35, 'programado', '00000000-0000-4000-b000-000000000011',
   now() - interval '20 min', null, null, now() - interval '19 min'),
  -- Gabriel está en la parada, lleno y con una persona en lista de espera
  ('00000000-0000-4000-b000-000000000013', '00000000-0000-4000-a000-000000000015', 'vg_a_centro', 4, 15, 'en_parada', null,
   now() - interval '1 min', null, null, now() - interval '40 min'),
  -- Nelson viene del Centro hacia Valle Grande
  ('00000000-0000-4000-b000-000000000014', '00000000-0000-4000-a000-000000000016', 'centro_a_vg', 5, 15, 'en_camino', null,
   now() - interval '3 min', null, null, now() - interval '10 min');

insert into public.reservas (viaje_id, pasajero_id, nombre, estado, lugar, creado_en, cerrada_en) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000027', null, 'bajo', 'Portón Valle Grande Country', now() - interval '1 day 50 min', now() - interval '1 day'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000028', null, 'bajo', 'Eje Valle Grande, frente a la panadería', now() - interval '1 day 49 min', now() - interval '1 day'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000029', null, 'bajo', 'Portón Valle Grande Country', now() - interval '1 day 50 min', now() - interval '1 day'),
  -- María viajó ayer: así el Inicio le ofrece su lugar reciente (R25)
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000021', null, 'bajo', 'Calle 3, casa de rejas verdes', now() - interval '1 day 48 min', now() - interval '1 day'),
  ('00000000-0000-4000-b000-000000000011', '00000000-0000-4000-a000-000000000027', null, 'activa', 'Portón Valle Grande Country', now() - interval '15 min', null),
  ('00000000-0000-4000-b000-000000000011', '00000000-0000-4000-a000-000000000028', null, 'activa', 'Entrada de Las Cayenas', now() - interval '12 min', null),
  ('00000000-0000-4000-b000-000000000012', '00000000-0000-4000-a000-000000000031', null, 'activa', 'Plaza Bolívar', now() - interval '8 min', null),
  ('00000000-0000-4000-b000-000000000013', '00000000-0000-4000-a000-000000000029', null, 'activa', 'Portón Valle Grande Country', now() - interval '35 min', null),
  ('00000000-0000-4000-b000-000000000013', null, 'Señora del 4-B', 'activa', 'Portón Valle Grande Country', now() - interval '34 min', null),
  ('00000000-0000-4000-b000-000000000013', '00000000-0000-4000-a000-000000000030', null, 'activa', 'Eje Valle Grande, frente a la panadería', now() - interval '30 min', null),
  ('00000000-0000-4000-b000-000000000013', null, 'Pasajero sin app', 'activa', 'Portón Valle Grande Country', now() - interval '25 min', null),
  -- Lista de espera de Gabriel: un anotado a mano que llegó tarde
  ('00000000-0000-4000-b000-000000000013', null, 'Muchacho del kiosko', 'activa', 'Portón Valle Grande Country', now() - interval '5 min', null);

insert into public.calificaciones (viaje_id, chofer_id, pasajero_id, estrellas, etiquetas, comentario, creado_en) values
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000014', '00000000-0000-4000-a000-000000000027', 5, '{Puntual,Amable}', 'Muy puntual y respetó el orden.', now() - interval '23 hours'),
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000014', '00000000-0000-4000-a000-000000000028', 4, '{Seguro}', null, now() - interval '23 hours'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000015', '00000000-0000-4000-a000-000000000029', 5, '{"Carro limpio",Amable}', 'Excelente.', now() - interval '23 hours');

insert into public.avisos (texto, autor_id)
values ('Hay cola en la avenida por un choque. Calcula unos 10 minutos más de viaje.', '00000000-0000-4000-a000-000000000001');
