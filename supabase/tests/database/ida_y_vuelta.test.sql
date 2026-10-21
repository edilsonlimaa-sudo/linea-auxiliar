-- Pruebas de ida y vuelta (docs/especificacion.md R61). Se ejecutan con:  npx supabase test db
-- Crean sus propias cuentas dentro de la transacción, que se deshace al final.
--   chofer: Tomás ...81
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
create function pg_temp.como(p_id text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;


select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000081', '0414-0000081', '{"rol": "chofer", "nombre": "Tomás Rey", "placa": "PA081AA"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now() where id = '00000000-0000-4000-a000-000000000081';
set local role authenticated;
select pg_temp.como('00000000-0000-4000-a000-000000000081');

-- Al publicar "Ida y vuelta": la ida y enseguida la vuelta (sentido contrario, mismos puestos)
select set_config('t.ida', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);
select set_config('t.vuelta', public.publicar_viaje('centro_a_vg', 4, 30)::text, true);
select is((select estado::text from public.viajes where id = current_setting('t.ida')::uuid), 'en_camino', 'R61: la ida queda en camino');
select is((select estado::text from public.viajes where id = current_setting('t.vuelta')::uuid), 'programado', 'R61: la vuelta queda como próximo viaje');
select is((select despues_de from public.viajes where id = current_setting('t.vuelta')::uuid), current_setting('t.ida')::uuid,
  'R61: la vuelta va encadenada detrás de la ida');

-- Al salir con la ida, la vuelta empieza sola (R12)
select public.avanzar_viaje(current_setting('t.ida')::uuid, 'en_parada');
select public.avanzar_viaje(current_setting('t.ida')::uuid, 'en_ruta');
select is((select estado::text from public.viajes where id = current_setting('t.vuelta')::uuid), 'en_camino', 'R61: al salir, la vuelta empieza sola');

-- Sin vuelta publicada: al salir se publica desde la hoja y queda en camino ya
select public.avanzar_viaje(current_setting('t.vuelta')::uuid, 'en_parada'); -- llega: la ida en ruta termina sola (R13)
select public.avanzar_viaje(current_setting('t.vuelta')::uuid, 'en_ruta');
select set_config('t.otra', public.publicar_viaje('vg_a_centro', 4, 30)::text, true);
select is((select estado::text from public.viajes where id = current_setting('t.otra')::uuid), 'en_camino', 'R61: la vuelta pedida al salir queda en camino');
select is((select eta_min from public.viajes where id = current_setting('t.otra')::uuid), 30, 'R61: con el tiempo que dijo');

select * from finish();
rollback;
