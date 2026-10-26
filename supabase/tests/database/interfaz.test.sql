-- §5.21 Interfaz nueva (R83): cada cuenta ve la clásica o la nueva; solo el admin la cambia.
-- Cuentas propias (se deshacen al final): admin ...06 · pasajeras Ana ...78, Rosa ...79
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

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

select public.crear_admin('prueba-interfaz', 'una-clave-segura', '00000000-0000-4000-a000-000000000006');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000078', '0414-0000078', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000079', '0414-0000079', '{"rol": "pasajero", "nombre": "Rosa Tovar"}');

set local role authenticated;

select pg_temp.yo('78');
select is(public.mi_interfaz(), 'clasica', 'R83: por defecto, la clásica');
select throws_ok($$ update public.perfiles set interfaz = 'nueva' where id = auth.uid() $$, '42501', null, 'R83: el usuario no la cambia solo');
select throws_ok($$ select public.admin_cambiar_interfaz(array[auth.uid()], 'nueva') $$,
  'P0001', 'Solo el administrador cambia la interfaz', 'R83: solo el admin la cambia');

select pg_temp.yo('06');
select is(public.admin_cambiar_interfaz(array['00000000-0000-4000-a000-000000000078', '00000000-0000-4000-a000-000000000079']::uuid[], 'nueva'), 2,
  'R83: el admin pasa a dos pasajeras a la nueva');
select is(public.admin_cambiar_interfaz(array['00000000-0000-4000-a000-000000000006']::uuid[], 'nueva'), 0, 'R83: la cuenta del admin no cambia');

select pg_temp.yo('78');
select is(public.mi_interfaz(), 'nueva', 'R84: la pasajera ya está en la nueva');
select pg_temp.yo('06');
select public.admin_cambiar_interfaz(array['00000000-0000-4000-a000-000000000078']::uuid[], 'clasica');
select pg_temp.yo('78');
select is(public.mi_interfaz(), 'clasica', 'R83: y vuelve a la clásica cuando el admin decide');

select * from finish();
rollback;
