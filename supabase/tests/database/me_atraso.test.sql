-- R70: "Me atraso". Cuentas propias (se deshacen al final): chofer Iván ...49, pasajera Eva ...75
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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

select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000049', '0414-0000049', '{"rol": "chofer", "nombre": "Iván Paz", "placa": "IP049AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000075', '0414-0000075', '{"rol": "pasajero", "nombre": "Eva Luna"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now()
 where id in ('00000000-0000-4000-a000-000000000049', '00000000-0000-4000-a000-000000000075');

set local role authenticated;
select pg_temp.yo('49');
select set_config('t.v', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);
-- Salió hace 15 min diciendo "llego en 10": ya pasó su hora
reset role;
update public.viajes set estado_en = now() - interval '15 minutes' where id = current_setting('t.v')::uuid;
set local role authenticated;

select lives_ok(format($$ select public.me_atraso('%s', 15) $$, current_setting('t.v')), 'R70: el chofer en camino da una hora nueva');
select is((select eta_min from public.viajes where id = current_setting('t.v')::uuid), 30,
  'R70: la hora prometida queda 15 min desde ahora (15 que ya pasaron + 15)');
select ok((select atraso_en is not null from public.viajes where id = current_setting('t.v')::uuid), 'R70: el pasajero puede ver que avisó');
reset role;
select is((select count(*)::int from public.viaje_eventos where viaje_id = current_setting('t.v')::uuid and atraso), 1,
  'R70: el aviso queda en la línea de tiempo');
select is((select eta_min from public.viaje_eventos where viaje_id = current_setting('t.v')::uuid and estado = 'en_camino' and not atraso), 10,
  'R70: la puntualidad sigue contra lo primero que prometió');
set local role authenticated;

select throws_ok(format($$ select public.me_atraso('%s', 0) $$, current_setting('t.v')), 'P0001', 'Escoge entre 1 y 120 minutos', 'R70: minutos razonables');
select pg_temp.yo('75');
select throws_ok(format($$ select public.me_atraso('%s', 10) $$, current_setting('t.v')), 'P0001', 'Solo los choferes pueden hacer esto', 'R70: solo el chofer');
select pg_temp.yo('49');
select public.avanzar_viaje(current_setting('t.v')::uuid, 'en_parada');
select throws_ok(format($$ select public.me_atraso('%s', 10) $$, current_setting('t.v')), 'P0001', 'Solo mientras vas a recoger', 'R70: ya llegó: no hay atraso que avisar');

select * from finish();
rollback;
