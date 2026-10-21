-- Pruebas de "¿Vuelves a trabajar hoy?" (docs/especificacion.md R60). Se ejecutan con:  npx supabase test db
-- Crean sus propias cuentas dentro de la transacción, que se deshace al final.
--   choferes: Pedro ...61, Luisa ...62 · pasajera: Rosa ...71
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
create function pg_temp.como(p_id text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
$$;

select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000061', '0414-0000061', '{"rol": "chofer", "nombre": "Pedro Mata", "placa": "PA061AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000062', '0414-0000062', '{"rol": "chofer", "nombre": "Luisa Gómez", "placa": "PA062AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000071', '0414-0000071', '{"rol": "pasajero", "nombre": "Rosa Tovar"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now(), conectado_en = now()
 where id in ('00000000-0000-4000-a000-000000000061', '00000000-0000-4000-a000-000000000062', '00000000-0000-4000-a000-000000000071');

set local role authenticated;

-- Pedro se desconecta: la hora de vuelta tiene que ser de ahora a 12 h
select pg_temp.como('00000000-0000-4000-a000-000000000061');
select throws_ok($$ select public.desconectar(now() - interval '1 minute') $$,
  'P0001', 'Escoge una hora de vuelta dentro de las próximas 12 horas', 'R60: no se vuelve en el pasado');
select throws_ok($$ select public.desconectar(now() + interval '13 hours') $$,
  'P0001', 'Escoge una hora de vuelta dentro de las próximas 12 horas', 'R60: como máximo 12 h');
select lives_ok($$ select public.desconectar(now() + interval '1 hour') $$, 'R60: Pedro vuelve en una hora');

-- Luisa terminó por hoy (sin argumento)
select pg_temp.como('00000000-0000-4000-a000-000000000062');
select lives_ok($$ select public.desconectar() $$, 'R60: sin hora = terminó por hoy');

-- Rosa ve a los dos: primero quien vuelve, después quien terminó
select pg_temp.como('00000000-0000-4000-a000-000000000071');
select results_eq(
  $$ select nombre, vuelve_en is not null from public.choferes_en_pausa() where chofer_id::text like '00000000-0000-4000-a000-00000000006_' $$,
  $$ values ('Pedro Mata'::text, true), ('Luisa Gómez'::text, false) $$,
  'R60: el pasajero ve quién vuelve (con hora) y quién terminó por hoy');
select is((select count(*)::int from public.pausas), 0, 'R60: la tabla de pausas no es visible para el pasajero');

-- Pedro vuelve: al conectarse la pausa se cierra sola y deja de verse
select pg_temp.como('00000000-0000-4000-a000-000000000061');
select public.conectar();
select isnt((select cerrada_en from public.pausas where chofer_id = auth.uid()), null, 'R60: conectarse cierra la pausa');
select pg_temp.como('00000000-0000-4000-a000-000000000071');
select results_eq($$ select nombre from public.choferes_en_pausa() where chofer_id::text like '00000000-0000-4000-a000-00000000006_' $$, $$ values ('Luisa Gómez'::text) $$,
  'R60: quien ya volvió no aparece en pausa');

-- Luisa publica un viaje: publicar conecta y también cierra la pausa
select pg_temp.como('00000000-0000-4000-a000-000000000062');
select public.publicar_viaje('vg_a_centro', 4, 10);
select is((select count(*)::int from public.pausas where chofer_id = auth.uid() and cerrada_en is null), 0,
  'R60: publicar un viaje cierra la pausa');

-- Una segunda pausa cierra la anterior: una sola abierta por chofer
select pg_temp.como('00000000-0000-4000-a000-000000000061');
select public.desconectar(now() + interval '30 minutes');
select is((select count(*)::int from public.pausas where chofer_id = auth.uid() and cerrada_en is null), 1,
  'R60: una sola pausa abierta por chofer');

-- La vuelta deja de mostrarse 30 min después de la hora dicha; "terminó por hoy", al día siguiente
reset role;
update public.pausas set inicio = now() - interval '3 hours', vuelve_en = now() - interval '31 minutes'
 where chofer_id = '00000000-0000-4000-a000-000000000061' and cerrada_en is null;
select pg_temp.como('00000000-0000-4000-a000-000000000062');
set local role authenticated;
select public.desconectar();
reset role;
update public.pausas set inicio = now() - interval '1 day'
 where chofer_id = '00000000-0000-4000-a000-000000000062' and cerrada_en is null;
set local role authenticated;
select pg_temp.como('00000000-0000-4000-a000-000000000071');
select is((select count(*)::int from public.choferes_en_pausa() where chofer_id::text like '00000000-0000-4000-a000-00000000006_'), 0, 'R60: una vuelta vencida o un "terminé" de ayer no se muestran');

-- La desconexión automática de medianoche (R9) no crea pausa
reset role;
update public.perfiles set conectado_en = now() where id = '00000000-0000-4000-a000-000000000061';
delete from public.viajes where chofer_id = '00000000-0000-4000-a000-000000000061';
select public.desconectar_inactivos();
select is((select count(*)::int from public.pausas where chofer_id = '00000000-0000-4000-a000-000000000061' and cerrada_en is null), 0,
  'R60: desconectar a medianoche no crea pausa');

-- Nadie sin sesión
select pg_temp.como('00000000-0000-0000-0000-000000000000');
select set_config('request.jwt.claims', '{}', true);
set local role authenticated;
select throws_ok($$ select * from public.choferes_en_pausa() where chofer_id::text like '00000000-0000-4000-a000-00000000006_' $$, 'P0001', 'Necesitas iniciar sesión', 'R60: pide sesión');

select * from finish();
rollback;
