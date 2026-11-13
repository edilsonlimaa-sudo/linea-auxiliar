-- R111–R112: tablero_chofer() devuelve los números del propio chofer: hoy, el mes contra el mes pasado a la misma
-- fecha, lo cobrado estimado y sus opiniones. Cuentas propias (se deshacen al final): choferes Juan ...d1 y Luis ...d2,
-- pasajeras Ana ...d3 y Bea ...d4
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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
-- Un momento de un día en hora de Caracas
create function pg_temp.a_las(p_dia date, p_hora text) returns timestamptz language sql as $$
  select (p_dia + p_hora::time) at time zone 'America/Caracas';
$$;

select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d1', '0414-0000901', '{"rol": "chofer", "nombre": "Juan Rojas", "placa": "AB901CD"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d2', '0414-0000902', '{"rol": "chofer", "nombre": "Luis Mata", "placa": "AB902CD"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d3', '0414-0000903', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d4', '0414-0000904', '{"rol": "pasajero", "nombre": "Bea Luna"}');

create temp table fechas as select public._hoy_caracas() hoy,
  (date_trunc('month', public._hoy_caracas()) - interval '1 month')::date ini_ant;
-- R79: la tarifa de las 10:00 de hoy (Bs. 1.300 si es domingo); la de las 7:00 p. m. siempre es la especial
create temp table t as select case when extract(isodow from hoy) = 7 then 1300 else 1000 end diez from fechas;
grant select on fechas, t to authenticated;

insert into public.viajes (id, chofer_id, sentido, puestos, estado, salida_en, creado_en) values
  -- Hoy: dos terminados de Juan (10:00 y 7:00 p. m.), uno cancelado y uno abierto; uno de Luis
  ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-a000-0000000000d1', 'vg_a_centro', 4, 'finalizado', pg_temp.a_las((select hoy from fechas), '10:00'), pg_temp.a_las((select hoy from fechas), '09:30')),
  ('00000000-0000-4000-b000-0000000000e2', '00000000-0000-4000-a000-0000000000d1', 'centro_a_vg', 4, 'finalizado', pg_temp.a_las((select hoy from fechas), '19:00'), pg_temp.a_las((select hoy from fechas), '18:30')),
  ('00000000-0000-4000-b000-0000000000e3', '00000000-0000-4000-a000-0000000000d1', 'vg_a_centro', 4, 'cancelado', null, pg_temp.a_las((select hoy from fechas), '08:00')),
  ('00000000-0000-4000-b000-0000000000e4', '00000000-0000-4000-a000-0000000000d1', 'vg_a_centro', 4, 'en_camino', null, now()),
  ('00000000-0000-4000-b000-0000000000e5', '00000000-0000-4000-a000-0000000000d2', 'vg_a_centro', 4, 'finalizado', pg_temp.a_las((select hoy from fechas), '10:00'), pg_temp.a_las((select hoy from fechas), '09:00')),
  -- El mes pasado: uno el día 1 (cuenta para "a la misma fecha") y uno el 28 (después de esa fecha, no cuenta)
  ('00000000-0000-4000-b000-0000000000e6', '00000000-0000-4000-a000-0000000000d1', 'vg_a_centro', 4, 'finalizado', pg_temp.a_las((select ini_ant from fechas), '10:00'), pg_temp.a_las((select ini_ant from fechas), '09:00')),
  ('00000000-0000-4000-b000-0000000000e7', '00000000-0000-4000-a000-0000000000d1', 'vg_a_centro', 4, 'finalizado', pg_temp.a_las((select ini_ant + 27 from fechas), '10:00'), pg_temp.a_las((select ini_ant + 27 from fechas), '09:00'));

insert into public.reservas (viaje_id, pasajero_id, nombre, estado, lugar, personas, gratis, creado_en) values
  ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-a000-0000000000d3', 'Ana', 'subio', 'Portón', 2, false, now()),
  ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-a000-0000000000d4', 'Bea', 'bajo', 'Eje', 1, true, now()),
  ('00000000-0000-4000-b000-0000000000e1', null, 'No vino', 'no_llego', null, 1, false, now()),
  ('00000000-0000-4000-b000-0000000000e2', null, 'Señor', 'subio', null, 1, false, now()),
  ('00000000-0000-4000-b000-0000000000e3', null, 'Cancelado', 'subio', null, 3, false, now()),
  ('00000000-0000-4000-b000-0000000000e5', null, 'De Luis', 'subio', null, 4, false, now()),
  ('00000000-0000-4000-b000-0000000000e6', null, 'Mes pasado', 'subio', null, 1, false, now()),
  ('00000000-0000-4000-b000-0000000000e7', null, 'Mes pasado, tarde', 'subio', null, 2, false, now());

insert into public.cuota_pagos (chofer_id, dia, referencia, banco, monto, estado, habilita) values
  ('00000000-0000-4000-a000-0000000000d1', (select hoy from fechas), '111111', '0102', 1000, 'aprobado', true),
  ('00000000-0000-4000-a000-0000000000d1', (select hoy from fechas), '222222', '0102', 1000, 'rechazado', false);

insert into public.calificaciones (viaje_id, chofer_id, pasajero_id, estrellas, etiquetas, comentario, creado_en) values
  ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-a000-0000000000d1', '00000000-0000-4000-a000-0000000000d3', 5, array['Amable', 'Puntual'], 'Muy bien', now()),
  ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-a000-0000000000d1', '00000000-0000-4000-a000-0000000000d4', 3, array['Amable'], ' ', now() - interval '1 min'),
  ('00000000-0000-4000-b000-0000000000e6', '00000000-0000-4000-a000-0000000000d1', '00000000-0000-4000-a000-0000000000d3', 4, array['Amable'], 'Bien', pg_temp.a_las((select ini_ant from fechas), '12:00'));

set local role authenticated;

select pg_temp.yo('d3');
select throws_ok($$ select public.tablero_chofer() $$, 'P0001', 'Solo los choferes pueden hacer esto', 'Solo un chofer abre su tablero');

select pg_temp.yo('d1');
create temp table j as select public.tablero_chofer() j;

select is((select (j->'hoy'->>'viajes')::int from j), 2, 'Hoy: sus dos viajes terminados (no el cancelado ni el de Luis)');
select is((select (j->'hoy'->>'pasajeros')::int from j), 4, 'Hoy: los que subieron o se bajaron, con su grupo (no el que no vino)');
select is((select (j->'hoy'->>'abiertos')::int from j), 1, 'Hoy: su viaje abierto');
select is((select (j->'mes'->>'viajes')::int from j), 2, 'El mes: sus viajes terminados');
select is((select (j->'mes'->>'pasajeros')::int from j), 4, 'El mes: sus pasajeros');
select is((select (j->'mes'->>'pasajeros_antes')::int from j), 1, 'El mes pasado, solo hasta la misma fecha');
select is((select (j->'mes'->>'viajes_antes')::int from j), 1, 'Los viajes del mes pasado hasta la misma fecha');
select is((select jsonb_array_length(j->'mes'->'dias') from j), (select extract(day from hoy)::int from fechas), 'Un día por cada día del mes hasta hoy');
select is((select (j->'mes'->'dias'->-1->>'pasajeros')::int from j), 4, 'Hoy, en las barras del mes');
select is((select (j->'cobrado'->>'pasajes')::int from j), (select 3 * diez + 1300 from t), 'Pasajes a la tarifa de la hora de salida (R79)');
select is((select (j->'cobrado'->>'gratis')::int from j), (select diez from t), 'Un pasaje por reserva pagada con viaje gratis (R103)');
select is((select (j->'cobrado'->>'cuotas')::numeric from j), 1000::numeric, 'Solo las cuotas aprobadas del mes (R77)');
select is((select (j->'opiniones'->>'cantidad')::int from j), 3, 'Todas sus opiniones');
select is((select (j->'opiniones'->>'cantidad_mes')::int from j), 2, 'Las del mes');
select is((select j->'opiniones'->'etiquetas'->0->>'etiqueta' from j), 'Amable', 'Lo que más destacan, primero');
select is((select array(select c->>'comentario' from j, jsonb_array_elements(j->'opiniones'->'comentarios') c)), array['Muy bien', 'Bien'], 'Los dos comentarios más recientes con texto, sin nombres');

select * from finish();
rollback;
