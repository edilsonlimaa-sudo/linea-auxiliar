-- R4: el admin restablece el PIN (temporal, una vez) y la persona escoge el suyo antes de seguir.
-- Cuentas propias (se deshacen al final): admin ...08 · pasajero José ...c1 · pasajera Ana ...c2
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
-- ¿Ese PIN abre la cuenta?
create function pg_temp.abre(p text, p_pin text) returns boolean language sql security definer as $$
  select encrypted_password = extensions.crypt(p_pin, encrypted_password) from auth.users where id = ('00000000-0000-4000-a000-0000000000' || p)::uuid
$$;
create function pg_temp.sesiones(p text) returns int language sql security definer as $$
  select count(*)::int from auth.sessions where user_id = ('00000000-0000-4000-a000-0000000000' || p)::uuid
$$;
create function pg_temp.debe(p text) returns boolean language sql security definer as $$
  select debe_cambiar_clave from public.perfiles where id = ('00000000-0000-4000-a000-0000000000' || p)::uuid
$$;

select public.crear_admin('prueba-pin', 'una-clave-segura', '00000000-0000-4000-a000-000000000008');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000c1', '0414-00000c1', '{"rol": "pasajero", "nombre": "José Henríquez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000c2', '0414-00000c2', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
-- José tenía una sesión abierta en otro teléfono
insert into auth.sessions (id, user_id, created_at, updated_at) values (gen_random_uuid(), '00000000-0000-4000-a000-0000000000c1', now(), now());

set local role authenticated;

select pg_temp.yo('c2');
select throws_ok($$ select public.admin_restablecer_pin('00000000-0000-4000-a000-0000000000c1') $$,
  'P0001', 'Solo el administrador restablece el PIN', 'R4: solo el admin restablece un PIN');

select pg_temp.yo('08');
select set_config('t.pin', public.admin_restablecer_pin('00000000-0000-4000-a000-0000000000c1'), true);
select matches(current_setting('t.pin'), '^\d{6}$', 'R4: el PIN temporal tiene 6 números');
select ok(pg_temp.abre('c1', current_setting('t.pin')) and not pg_temp.abre('c1', '123456'), 'R4: abre con el temporal y ya no con el anterior');
select ok(pg_temp.debe('c1'), 'R4: tendrá que escoger su PIN al entrar');
select is(pg_temp.sesiones('c1'), 0, 'R4: se cierran sus sesiones abiertas');
select throws_ok($$ select public.admin_restablecer_pin('00000000-0000-4000-a000-000000000008') $$,
  'P0001', 'Esa cuenta no existe', 'R4: solo cuentas de pasajero o chofer');

select pg_temp.yo('c1');
select throws_ok($$ select public.cambiar_mi_pin('12345') $$, 'P0001', 'El PIN debe tener 6 números', 'R4: el PIN nuevo tiene 6 números');
select throws_ok(format('select public.cambiar_mi_pin(%L)', current_setting('t.pin')),
  'P0001', 'Escoge un PIN distinto al temporal', 'R4: no puede quedarse con el temporal');
select lives_ok($$ select public.cambiar_mi_pin('482913') $$, 'R4: escoge su PIN');
select ok(pg_temp.abre('c1', '482913') and not pg_temp.abre('c1', current_setting('t.pin')), 'R4: entra con el suyo; el temporal ya no sirve');
select ok(not pg_temp.debe('c1'), 'R4: ya puede usar la app');

select * from finish();
rollback;
