-- §5.23 R93: la cuenta recién registrada pide, una sola vez, los aparatos del admin para avisarle.
-- Cuentas propias (se deshacen al final): admin ...09 · pasajera aprobada Ana ...d1 · nuevas Caro ...d2 y Dani ...d3
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

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
create function pg_temp.yo(p text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-0000000000' || p, 'role', 'authenticated')::text, true);
$$;

select public.crear_admin('prueba-aviso', 'una-clave-segura', '00000000-0000-4000-a000-000000000009');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d1', '0414-00000d1', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now() where id = '00000000-0000-4000-a000-0000000000d1';
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d2', '0414-00000d2', '{"rol": "pasajero", "nombre": "Caro Ruiz"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000d3', '0414-00000d3', '{"rol": "chofer", "nombre": "Dani Mora", "placa": "AV00D3"}');
-- Viejas inscripciones fuera de esta prueba no cuentan: se comparan solo las de aquí
create temp table mias (endpoint text);
insert into mias values ('https://push.ejemplo/admin-1'), ('https://push.ejemplo/ana');
grant select on mias to authenticated;

set local role authenticated;
select pg_temp.yo('09');
select public.guardar_suscripcion('https://push.ejemplo/admin-1', 'clave', 'secreto');
select pg_temp.yo('d1');
select public.guardar_suscripcion('https://push.ejemplo/ana', 'clave', 'secreto');

select pg_temp.yo('d2');
select is((select array_agg(endpoint) from public.aviso_de_cuenta_nueva() where endpoint in (select endpoint from mias)),
  array['https://push.ejemplo/admin-1'], 'R93: la cuenta nueva recibe solo los aparatos del admin');
select is((select count(*)::int from public.aviso_de_cuenta_nueva()), 0, 'R93: una sola vez por cuenta');

select pg_temp.yo('d1');
select is((select count(*)::int from public.aviso_de_cuenta_nueva()), 0, 'R93: una cuenta aprobada no pide nada');

reset role;
update public.perfiles set creado_en = now() - interval '20 minutes' where id = '00000000-0000-4000-a000-0000000000d3';
set local role authenticated;
select pg_temp.yo('d3');
select is((select count(*)::int from public.aviso_de_cuenta_nueva()), 0, 'R93: pasados 15 min ya no avisa');

select pg_temp.yo('09');
select is((select count(*)::int from public.aviso_de_cuenta_nueva()), 0, 'R93: el admin no se avisa a sí mismo');

select set_config('request.jwt.claims', '', true);
select throws_ok($$ select * from public.aviso_de_cuenta_nueva() $$, 'P0001', 'Necesitas iniciar sesión', 'R93: hace falta la sesión');

select * from finish();
rollback;
