-- R36–R37: anotar a mano con dónde recogerlo y cuántos van. Cuenta propia (se deshace al final): chofer Iris ...38
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000038', 'authenticated', 'authenticated',
        public.correo_de_telefono('0414-0000038'), extensions.crypt('123456', extensions.gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"rol": "chofer", "nombre": "Iris Paz", "placa": "IP038AA", "telefono": "0414-0000038"}', now(), now());
update public.perfiles set estado = 'aprobado', aprobado_en = now() where id = '00000000-0000-4000-a000-000000000038';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000038", "role": "authenticated"}', true);
select set_config('t.v', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);

select lives_ok(format($$ select public.ocupar_puesto('%s', null, 'Entrada Frailejones', 2) $$, current_setting('t.v')),
  'R36: anota a mano con el lugar y cuántos van, sin nombre');
select results_eq(format($$ select nombre, lugar, personas from public.reservas where viaje_id = '%s' $$, current_setting('t.v')),
  $$ values ('Pasajero sin app'::text, 'Entrada Frailejones'::text, 2) $$, 'R36: queda el lugar, sin nombre');
select is((select ocupados from public.viajes where id = current_setting('t.v')::uuid), 2, 'R57: cuenta las personas');
select throws_ok(format($$ select public.ocupar_puesto('%s', null, null, 3) $$, current_setting('t.v')), 'P0001',
  'No caben 3: te quedan 2 puestos', 'R37: solo si caben todos');
select throws_ok(format($$ select public.ocupar_puesto('%s', null, null, 5) $$, current_setting('t.v')), 'P0001',
  'Escoge cuántos van (de 1 a 4)', 'R57: de 1 a 4');
select lives_ok(format($$ select public.ocupar_puesto('%s') $$, current_setting('t.v')), 'R36: un toque basta (sin nada)');

select * from finish();
rollback;
