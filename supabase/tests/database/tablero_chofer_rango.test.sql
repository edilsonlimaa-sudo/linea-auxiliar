-- R111–R112: tablero_chofer_rango(desde, hasta) da los números del propio chofer por día o semana: viajes, pasajeros,
-- lo cobrado estimado, el tramo anterior igual de largo, cada día y sus viajes. Cuentas propias (se deshacen al final):
-- choferes Juan ...f1 y Luis ...f2, pasajera Ana ...f3
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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
create function pg_temp.a_las(p_dia date, p_hora text) returns timestamptz language sql as $$
  select (p_dia + p_hora::time) at time zone 'America/Caracas';
$$;

select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f1', '0414-0000951', '{"rol": "chofer", "nombre": "Juan Rojas", "placa": "AB951CD"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f2', '0414-0000952', '{"rol": "chofer", "nombre": "Luis Mata", "placa": "AB952CD"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f3', '0414-0000953', '{"rol": "pasajero", "nombre": "Ana Pérez"}');

create temp table fechas as select public._hoy_caracas() hoy;
grant select on fechas to authenticated;

insert into public.viajes (id, chofer_id, sentido, puestos, estado, salida_en, llegada_en, creado_en) values
  -- Hoy, de Juan: uno terminado a las 7:00 p. m. (tarifa especial) y uno cancelado; uno de Luis
  ('00000000-0000-4000-b000-0000000000f1', '00000000-0000-4000-a000-0000000000f1', 'vg_a_centro', 4, 'finalizado',
     pg_temp.a_las((select hoy from fechas), '19:00'), pg_temp.a_las((select hoy from fechas), '19:30'), pg_temp.a_las((select hoy from fechas), '18:30')),
  ('00000000-0000-4000-b000-0000000000f2', '00000000-0000-4000-a000-0000000000f1', 'centro_a_vg', 4, 'cancelado',
     null, null, pg_temp.a_las((select hoy from fechas), '08:00')),
  ('00000000-0000-4000-b000-0000000000f3', '00000000-0000-4000-a000-0000000000f2', 'vg_a_centro', 4, 'finalizado',
     pg_temp.a_las((select hoy from fechas), '19:00'), null, pg_temp.a_las((select hoy from fechas), '18:30')),
  -- Ayer, de Juan, a las 7:00 p. m.
  ('00000000-0000-4000-b000-0000000000f4', '00000000-0000-4000-a000-0000000000f1', 'centro_a_vg', 4, 'finalizado',
     pg_temp.a_las((select hoy from fechas) - 1, '19:00'), null, pg_temp.a_las((select hoy from fechas) - 1, '18:30'));

insert into public.reservas (viaje_id, pasajero_id, personas, estado) values
  ('00000000-0000-4000-b000-0000000000f1', '00000000-0000-4000-a000-0000000000f3', 2, 'subio'),
  ('00000000-0000-4000-b000-0000000000f3', '00000000-0000-4000-a000-0000000000f3', 3, 'subio'),
  ('00000000-0000-4000-b000-0000000000f4', '00000000-0000-4000-a000-0000000000f3', 1, 'bajo');

set local role authenticated;
select pg_temp.yo('f1');
create temp table hoy as select public.tablero_chofer_rango((select hoy from fechas), (select hoy from fechas)) d;

select is((select (d->>'viajes')::int from hoy), 1, 'Hoy: solo el viaje terminado de Juan');
select is((select (d->>'pasajeros')::int from hoy), 2, 'Hoy: sus pasajeros, con el grupo');
select is((select (d->'cobrado'->>'pasajes')::int from hoy), 2600, 'Hoy: 2 pasajes a la tarifa especial de las 7:00 p. m.');
select is((select (d->>'viajes_antes')::int from hoy), 1, 'El día anterior: el viaje de ayer');
select is((select (d->>'pasajeros_antes')::int from hoy), 1, 'El día anterior: quien se bajó en el camino cuenta');
select is((select jsonb_array_length(d->'lista') from hoy), 1, 'La lista del día: su viaje terminado');
select is((select (d->'lista'->0->>'pasajes')::int from hoy), 2600, 'Cada viaje con lo cobrado');

create temp table semana as select public.tablero_chofer_rango((select hoy from fechas) - 6, (select hoy from fechas) + 3) d;
select is((select (d->>'hasta')::date from semana), (select hoy from fechas), 'Nunca días futuros: termina hoy');
select is((select jsonb_array_length(d->'dias') from semana), 7, 'Un día por fila, también los de cero');
select is((select (d->>'viajes')::int from semana), 2, 'La semana: los dos viajes terminados de Juan');

select throws_ok($$ select public.tablero_chofer_rango(current_date - 40, current_date) $$, 'Hasta 31 días');

select pg_temp.yo('f3');
select throws_ok($$ select public.tablero_chofer_rango(current_date, current_date) $$, null, 'Un pasajero no tiene tablero');

select * from finish();
rollback;
