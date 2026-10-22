-- Diseño nuevo del pasajero (v2): nadie se marca solo. Cuenta propia (se deshace al final): pasajera Lía ...76
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000076', 'authenticated', 'authenticated',
        public.correo_de_telefono('0414-0000076'), extensions.crypt('123456', extensions.gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}', '{"rol": "pasajero", "nombre": "Lía Mar", "telefono": "0414-0000076"}', now(), now());
update public.perfiles set estado = 'aprobado', aprobado_en = now() where id = '00000000-0000-4000-a000-000000000076';

select is((select diseno_v2 from public.perfiles where id = '00000000-0000-4000-a000-000000000076'), false,
  'v2: una cuenta nueva ve el diseño de siempre');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-000000000076", "role": "authenticated"}', true);
select throws_ok($$ update public.perfiles set diseno_v2 = true where id = '00000000-0000-4000-a000-000000000076' $$,
  '42501', null, 'v2: el pasajero no puede marcarse solo');
select lives_ok($$ update public.perfiles set nombre = 'Lía Mar' where id = '00000000-0000-4000-a000-000000000076' $$,
  'v2: su perfil se sigue editando como siempre');

select * from finish();
rollback;
