-- R62: el aviso en la lista vale 60 min (antes 30) y "Sigo aquí" lo renueva a 60. Cuenta propia (se deshace al final): pasajera Ema ...77
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000077', 'authenticated', 'authenticated',
        public.correo_de_telefono('0414-0000077'), extensions.crypt('123456', extensions.gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}', '{"rol": "pasajero", "nombre": "Ema Sol", "telefono": "0414-0000077"}', now(), now());
update public.perfiles set estado = 'aprobado', aprobado_en = now() where id = '00000000-0000-4000-a000-000000000077';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000077", "role": "authenticated"}', true);
select public.estoy_en_lista(true, null, null, null, 1, null);

reset role;
select ok((select vence_en between now() + interval '59 minutes' and now() + interval '61 minutes'
             from public.lista_gina where pasajero_id = '00000000-0000-4000-a000-000000000077' and estado = 'esperando'),
  'R62: el aviso vale 60 min');

-- Le quedan 5 min: "Sigo aquí" lo deja otra vez en 60 desde ahora
update public.lista_gina set vence_en = now() + interval '5 minutes' where pasajero_id = '00000000-0000-4000-a000-000000000077';
set local role authenticated;
select lives_ok($$ select public.sigo_en_lista() $$, 'R62: Sigo aquí');
reset role;
select ok((select vence_en between now() + interval '59 minutes' and now() + interval '61 minutes'
             from public.lista_gina where pasajero_id = '00000000-0000-4000-a000-000000000077' and estado = 'esperando'),
  'R62: Sigo aquí renueva a 60 min');

select * from finish();
rollback;
