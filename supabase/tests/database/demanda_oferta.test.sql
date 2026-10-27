-- §5.22 Demanda y oferta (R86–R87): el histórico por hora del panel y las cuentas de prueba.
-- Cuentas propias (se deshacen al final): admin ...07 · chofer Carlos ...a1 · pasajeras Ana ...a2, Bea ...a3, Pía ...a4
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

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
-- Una hora del 20/10/2026 en Caracas
create function pg_temp.a(p text) returns timestamptz language sql as $$ select ('2026-10-20 ' || p)::timestamp at time zone 'America/Caracas' $$;
create function pg_temp.valle(p_columna text) returns int language plpgsql as $$
declare v int;
begin
  execute format('select %I from public.admin_demanda_oferta(%L, %L) where hora = 15', p_columna, '2026-10-20', '2026-10-20') into v;
  return v;
end;
$$;

select public.crear_admin('prueba-demanda', 'una-clave-segura', '00000000-0000-4000-a000-000000000007');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000a1', '0414-00000a1', '{"rol": "chofer", "nombre": "Carlos Ruiz", "placa": "AB123CD"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000a2', '0414-00000a2', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000a3', '0414-00000a3', '{"rol": "pasajero", "nombre": "Bea Díaz"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000a4', '0414-00000a4', '{"rol": "pasajero", "nombre": "Pía Gil"}');

-- La historia de una tarde, escrita directo (sin las reglas de las funciones): a las 3 p. m. Ana se anota dos veces
-- seguidas y las dos vencen; Bea (2 personas) sube; Pía se va en la van; Carlos sale de Gina a las 3:25
set local session_replication_role = replica;
insert into public.lista_gina (pasajero_id, en_gina, lugar, personas, estado, creada_en, vence_en, cerrada_en) values
  ('00000000-0000-4000-a000-0000000000a2', true, 'Gina', 1, 'vencida', pg_temp.a('15:00'), pg_temp.a('15:30'), pg_temp.a('15:30')),
  ('00000000-0000-4000-a000-0000000000a2', true, 'Gina', 1, 'vencida', pg_temp.a('15:40'), pg_temp.a('16:10'), pg_temp.a('16:10')),
  ('00000000-0000-4000-a000-0000000000a3', true, 'Gina', 2, 'subio', pg_temp.a('15:10'), pg_temp.a('15:40'), pg_temp.a('15:25'));
with l as (
  insert into public.lista_gina (pasajero_id, en_gina, lugar, personas, estado, creada_en, vence_en, cerrada_en)
  values ('00000000-0000-4000-a000-0000000000a4', true, 'Gina', 1, 'se_fue', pg_temp.a('15:20'), pg_temp.a('15:50'), pg_temp.a('15:45'))
  returning id
)
insert into public.lista_gina_privado (id, motivo_salida) select id, 'van' from l;
insert into public.viajes (chofer_id, sentido, puestos, estado, creado_en, estado_en, salida_en, llegada_en)
values ('00000000-0000-4000-a000-0000000000a1', 'centro_a_vg', 4, 'finalizado', pg_temp.a('15:00'), pg_temp.a('15:45'), pg_temp.a('15:25'), pg_temp.a('15:45'));
set local session_replication_role = origin;

set local role authenticated;

select pg_temp.yo('a2');
select throws_ok($$ select * from public.admin_demanda_oferta('2026-10-20', '2026-10-20') $$,
  'P0001', 'Solo el administrador ve la demanda', 'R87: solo el admin ve la demanda');
select throws_ok($$ select public.admin_marcar_prueba('00000000-0000-4000-a000-0000000000a4', true) $$,
  'P0001', 'Solo el administrador marca cuentas de prueba', 'R86: solo el admin marca cuentas de prueba');

select pg_temp.yo('07');
select is(pg_temp.valle('valle_quieren'), 4, 'R87: a las 3 p. m. querían ir 4 personas (Ana una vez, Bea con 2, Pía)');
select is(pg_temp.valle('valle_vencio'), 1, 'R87: las dos anotaciones seguidas de Ana son una sola espera, que venció');
select is(pg_temp.valle('valle_llevados'), 2, 'R87: Bea y su acompañante fueron llevadas');
select is(pg_temp.valle('valle_otro'), 1, 'R87: Pía se fue en otro transporte');
select is(pg_temp.valle('valle_salidas') || ' salida, ' || pg_temp.valle('valle_puestos') || ' puestos', '1 salida, 4 puestos',
  'R87: la salida de Gina cuenta en su hora, con sus puestos');
select is(pg_temp.valle('choferes'), 1, 'R87: un chofer trabajando a las 3 p. m.');

select public.admin_marcar_prueba('00000000-0000-4000-a000-0000000000a4', true);
select is(pg_temp.valle('valle_quieren') || ' querían, ' || pg_temp.valle('valle_otro') || ' otro transporte', '3 querían, 0 otro transporte',
  'R86: lo de una cuenta de prueba no cuenta');
select throws_ok($$ select public.admin_marcar_prueba('00000000-0000-4000-a000-000000000007', true) $$,
  'P0001', 'No encontramos esa cuenta', 'R86: solo pasajeros y choferes');

select * from finish();
rollback;
