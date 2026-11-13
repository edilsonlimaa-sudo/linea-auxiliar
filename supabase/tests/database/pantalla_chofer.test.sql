-- Fase 0 de la app nativa: pantalla_chofer() devuelve el Inicio del chofer (sus viajes con la lista del carro).
-- Cuentas propias (se deshacen al final): chofer Juan ...d1, otro chofer Luis ...d2, pasajeras Ana ...d3 y Bea ...d4
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

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

select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d1', '0414-0000801', '{"rol": "chofer", "nombre": "Juan Rojas", "placa": "AB801CD"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d2', '0414-0000802', '{"rol": "chofer", "nombre": "Luis Mata", "placa": "AB802CD"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d3', '0414-0000803', '{"rol": "pasajero", "nombre": "Ana María Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d4', '0414-0000804', '{"rol": "pasajero", "nombre": "Bea"}');

-- Juan: un viaje recogiendo (Ana con 2 personas, Bea, y uno sin app) y uno terminado que no debe salir
insert into public.viajes (id, chofer_id, sentido, puestos, estado, creado_en) values
  ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-a000-0000000000d1', 'vg_a_centro', 3, 'en_camino', now() - interval '10 min'),
  ('00000000-0000-4000-b000-0000000000e2', '00000000-0000-4000-a000-0000000000d1', 'centro_a_vg', 4, 'finalizado', now() - interval '2 hours'),
  ('00000000-0000-4000-b000-0000000000e3', '00000000-0000-4000-a000-0000000000d2', 'vg_a_centro', 4, 'en_camino', now());
insert into public.reservas (viaje_id, pasajero_id, nombre, estado, lugar, personas, creado_en) values
  ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-a000-0000000000d3', 'Ana', 'activa', 'Portón', 2, now() - interval '9 min'),
  ('00000000-0000-4000-b000-0000000000e1', '00000000-0000-4000-a000-0000000000d4', 'Bea', 'activa', 'Eje', 1, now() - interval '8 min'),
  ('00000000-0000-4000-b000-0000000000e1', null, 'Señor del sombrero', 'subio', null, 1, now() - interval '7 min');

set local role authenticated;

select pg_temp.yo('d3');
select throws_ok($$ select public.pantalla_chofer() $$, 'P0001', 'Solo los choferes pueden hacer esto', 'Solo el chofer abre su pantalla');

select pg_temp.yo('d1');
create temp table p as select public.pantalla_chofer() j;
select is((select jsonb_array_length(j->'viajes') from p), 1, 'Solo sus viajes abiertos (no el terminado ni el de Luis)');
select is((select j->'vehiculo'->>'placa' from p), 'AB801CD', 'Con su carro');
select is((select j->'ultimo'->>'sentido' from p), 'vg_a_centro', 'Y el último viaje, para sugerir al publicar');
select is((select jsonb_array_length(j->'viajes'->0->'lista') from p), 3, 'La lista del carro: tres reservas');
select is((select string_agg(e->>'nombre', ' · ' order by (e->>'posicion')::int) from p, jsonb_array_elements(j->'viajes'->0->'lista') e),
  'Ana M. · Bea · Señor del sombrero', 'Nombres cortos, y el que puso el chofer para quien no tiene app');
select is((select string_agg((e->>'desde') || '-' || (e->>'hasta'), ' ' order by (e->>'posicion')::int) from p, jsonb_array_elements(j->'viajes'->0->'lista') e),
  '1-2 3-3 4-4', 'R57: los puestos se cuentan por personas');
select is((select string_agg(e->>'confirmado', ' ' order by (e->>'posicion')::int) from p, jsonb_array_elements(j->'viajes'->0->'lista') e),
  'true true false', 'Con 3 puestos, el cuarto no tiene puesto');
select ok((select (j->'viajes'->0->'lista'->0->>'telefono') like '%0000803' from p), '§6: el chofer ve el teléfono de quien reservó');
select is((select j->'viajes'->0->'lista'->2->>'con_app' from p), 'false', 'R36: el anotado a mano va sin app');
select ok((select j ? 'cuota' and j ? 'conectado' from p), 'Con la cuota del día y si está conectado');

select * from finish();
rollback;
