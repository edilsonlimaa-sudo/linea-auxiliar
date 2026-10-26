-- §5.20 Sugerencias y opinión sobre la app (R81–R82).
-- Cuentas propias (se deshacen al final): admin ...05 · chofer Pedro ...51 · pasajeras Ana ...75, Rosa ...76
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

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

select public.crear_admin('prueba-sugerencias', 'una-clave-segura', '00000000-0000-4000-a000-000000000005');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000051', '0414-0000051', '{"rol": "chofer", "nombre": "Pedro Lira", "placa": "PL051AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000075', '0414-0000075', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000076', '0414-0000076', '{"rol": "pasajero", "nombre": "Rosa Tovar"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now()
 where id in ('00000000-0000-4000-a000-000000000051', '00000000-0000-4000-a000-000000000075', '00000000-0000-4000-a000-000000000076');

-- Ana ya hizo 3 viajes con Pedro (terminados)
insert into public.viajes (id, chofer_id, sentido, puestos, estado)
select ('00000000-0000-4000-c000-00000000005' || n)::uuid, '00000000-0000-4000-a000-000000000051', 'vg_a_centro', 4, 'finalizado'
  from generate_series(1, 3) n;
insert into public.reservas (viaje_id, pasajero_id, lugar, estado)
select ('00000000-0000-4000-c000-00000000005' || n)::uuid, '00000000-0000-4000-a000-000000000075', 'Frailejones', 'subio'
  from generate_series(1, 3) n;

set local role authenticated;

-- R81: Ana envía una sugerencia; vacía no se envía
select pg_temp.yo('75');
select throws_ok($$ select public.enviar_sugerencia('   ') $$, 'P0001', 'Escribe tu sugerencia', 'R81: la sugerencia lleva texto');
select lives_ok($$ select public.enviar_sugerencia('Que avise cuando el carro esté cerca') $$, 'R81: Ana envía una sugerencia');

-- Rosa no ve la de Ana; el admin sí
select pg_temp.yo('76');
select is((select count(*)::int from public.sugerencias), 0, 'Privacidad: cada quien ve solo las suyas');
select pg_temp.yo('05');
select is((select count(*)::int from public.sugerencias where autor_id = '00000000-0000-4000-a000-000000000075'), 1, 'R81: el admin ve las sugerencias');
select lives_ok($$ select public.admin_marcar_sugerencia((select id from public.sugerencias where autor_id = '00000000-0000-4000-a000-000000000075'), true) $$,
  'R81: el admin la marca leída');
select isnt((select leida_en from public.sugerencias where autor_id = '00000000-0000-4000-a000-000000000075'), null, 'R81: queda leída');
select pg_temp.yo('75');
select throws_ok($$ select public.admin_marcar_sugerencia((select id from public.sugerencias limit 1), true) $$,
  'P0001', 'Solo el administrador lee las sugerencias', 'R81: solo el admin marca');

-- R82: a quién se le pide la opinión
select is(public.puede_valorar_app(), true, 'R82: pasajera con 3 viajes, sin opinar: se le pide');
select pg_temp.yo('76');
select is(public.puede_valorar_app(), false, 'R82: pasajera sin viajes: no se le pide');
select pg_temp.yo('51');
select is(public.puede_valorar_app(), false, 'R82: chofer con menos de 10 viajes: no se le pide');

-- Ana opina: ya no se le pide en 60 días
select pg_temp.yo('75');
select throws_ok($$ select public.valorar_app(6) $$, 'P0001', 'Toca las estrellas', 'R82: de 1 a 5 estrellas');
select lives_ok($$ select public.valorar_app(5, 'Me encanta') $$, 'R82: Ana opina sobre la app');
select is(public.puede_valorar_app(), false, 'R82: quien opinó no vuelve a verla en 60 días');

select * from finish();
rollback;
