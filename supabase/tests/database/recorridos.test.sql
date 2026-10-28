-- R92: el chofer sube su recorrido en lotes; solo el admin lo lee y se graba solo si el admin lo encendió.
-- Cuentas propias (se deshacen al final): admin ...09 · chofer Tomás ...d1 · chofer Raúl ...d2 · pasajera Pía ...d3
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
-- Un lote de n puntos cada 15 s, empezando hace p_hace_min minutos
create function pg_temp.lote(p_hace_min int, n int) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_array(extract(epoch from now())::bigint - p_hace_min * 60 + i * 15, 9.74 + i * 0.0001, -63.18, 8) order by i)
    from generate_series(0, n - 1) i
$$;

select public.crear_admin('prueba-recorridos', 'una-clave-segura', '00000000-0000-4000-a000-000000000009');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d1', '0414-00000d1', '{"rol": "chofer", "nombre": "Tomás Ruiz", "placa": "TR001AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d2', '0414-00000d2', '{"rol": "chofer", "nombre": "Raúl Gil", "placa": "RG002AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d3', '0414-00000d3', '{"rol": "pasajero", "nombre": "Pía Real"}');
update public.ajustes set grabar_recorridos = false;

set local role authenticated;

select pg_temp.yo('d1');
select is(public.grabar_recorridos(), false, 'R92: apagado por defecto, el teléfono no graba');
select is(public.guardar_trayecto(pg_temp.lote(30, 10)), 0, 'R92: apagado, el servidor no guarda nada');
select throws_ok($$ select public.admin_grabar_recorridos(true) $$, 'P0001', 'Solo el administrador cambia esto', 'R92: solo el admin lo enciende');

select pg_temp.yo('09');
select public.admin_grabar_recorridos(true);

select pg_temp.yo('d1');
select is(public.grabar_recorridos(), true, 'R92: encendido, el teléfono del chofer graba');
select is(public.guardar_trayecto(pg_temp.lote(30, 100)), 100, 'R92: el chofer sube un lote de 100 puntos');
select is(public.guardar_trayecto(pg_temp.lote(30, 100)), 0, 'R92: un reintento del mismo lote no duplica');
select is(public.guardar_trayecto(pg_temp.lote(30, 120)), 20, 'R92: si al reintentar ya había más puntos, solo guarda los nuevos');
select is(public.guardar_trayecto('[[0, 9.7, -63.1], ["x", 1, 2], [1, 999, 0]]'::jsonb), 0, 'R92: descarta puntos inválidos o de hace días');
select is((select count(*)::int from public.trayectos), 0, 'R92: el chofer no lee los recorridos');

select pg_temp.yo('d3');
select throws_ok($$ select public.guardar_trayecto('[]'::jsonb) $$, 'P0001', 'Solo los choferes pueden hacer esto', 'R92: solo choferes suben recorridos');
select is(public.grabar_recorridos(), false, 'R92: el teléfono de un pasajero nunca graba');

select pg_temp.yo('09');
select is((select string_agg(n::text, '+' order by desde) from public.trayectos where chofer_id = '00000000-0000-4000-a000-0000000000d1'),
  '100+20', 'R92: el admin ve los lotes de Tomás');

select * from finish();
rollback;
