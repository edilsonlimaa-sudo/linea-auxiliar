-- R73: ¿qué haces después? Cuentas propias (se deshacen al final): choferes Nora ...44 y Saúl ...35
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
end;
$$;
create function pg_temp.yo(p text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-0000000000' || p, 'role', 'authenticated')::text, true);
$$;
-- Publica, llega y sale: el viaje queda en ruta
create function pg_temp.en_ruta(p_sentido public.sentido) returns uuid language plpgsql as $$
declare v uuid;
begin
  v := public.publicar_viaje(p_sentido, 4, 10);
  perform public.avanzar_viaje(v, 'en_parada');
  perform public.avanzar_viaje(v, 'en_ruta');
  return v;
end;
$$;

select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000044', '0414-0000044', '{"rol": "chofer", "nombre": "Nora Díaz", "placa": "ND044AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000035', '0414-0000035', '{"rol": "chofer", "nombre": "Saúl Rey", "placa": "SR035AA"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now()
 where id in ('00000000-0000-4000-a000-000000000044', '00000000-0000-4000-a000-000000000035');

set local role authenticated;
select pg_temp.yo('44');

-- Antes de salir no se avisa
select set_config('t.p', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);
select throws_ok(format($$ select public.decir_despues('%s', 'ultimo') $$, current_setting('t.p')), 'P0001', 'Solo con el viaje en ruta',
  'R73: se avisa con el viaje en ruta');
select public.avanzar_viaje(current_setting('t.p')::uuid, 'en_parada');
select public.avanzar_viaje(current_setting('t.p')::uuid, 'en_ruta');

select throws_ok(format($$ select public.decir_despues('%s', 'pausa') $$, current_setting('t.p')), 'P0001',
  'Escoge una hora de vuelta dentro de las próximas 12 horas', 'R73: la pausa lleva hora');
select throws_ok(format($$ select public.decir_despues('%s', 'vuelta') $$, current_setting('t.p')), 'P0001', 'Escoge qué haces después',
  'R73: la vuelta no se avisa, se publica');
select lives_ok(format($$ select public.decir_despues('%s', 'pausa', now() + interval '1 hour') $$, current_setting('t.p')),
  'R73: avisa que hace una pausa');
select is((select despues from public.viajes where id = current_setting('t.p')::uuid), 'pausa', 'R73: queda en el viaje');

-- Cambió de idea: publica la vuelta y el viaje en ruta pasa a "vuelta"
select set_config('t.vuelta', public.publicar_viaje('centro_a_vg', 4, 20)::text, true);
select results_eq(format($$ select despues, despues_vuelve_en from public.viajes where id = '%s' $$, current_setting('t.p')),
  $$ values ('vuelta'::text, null::timestamptz) $$, 'R73: publicar en ruta lo cambia a vuelta');

-- Saúl: último viaje, al terminar queda desconectado con "terminó por hoy"
select pg_temp.yo('35');
select set_config('t.u', pg_temp.en_ruta('centro_a_vg')::text, true);
select public.decir_despues(current_setting('t.u')::uuid, 'ultimo');
select public.avanzar_viaje(current_setting('t.u')::uuid, 'finalizado');
reset role;
select ok((select conectado_en is null from public.perfiles where id = '00000000-0000-4000-a000-000000000035'),
  'R73: último viaje: al terminar queda desconectado');
select results_eq($$ select count(*)::int, bool_and(vuelve_en is null) from public.pausas
                     where chofer_id = '00000000-0000-4000-a000-000000000035' and cerrada_en is null $$,
  $$ values (1, true) $$, 'R73: con la pausa "terminó por hoy" (R60)');

-- Pausa: al terminar, la pausa con su hora
set local role authenticated;
select public.conectar();
select set_config('t.pa', pg_temp.en_ruta('vg_a_centro')::text, true);
select set_config('t.hora', (now() + interval '2 hours')::text, true);
select public.decir_despues(current_setting('t.pa')::uuid, 'pausa', current_setting('t.hora')::timestamptz);
select public.avanzar_viaje(current_setting('t.pa')::uuid, 'finalizado');
reset role;
select is((select vuelve_en from public.pausas where chofer_id = '00000000-0000-4000-a000-000000000035' and cerrada_en is null),
  current_setting('t.hora')::timestamptz, 'R73: pausa: queda la hora en que vuelve');

-- Sin aviso, terminar no desconecta (como antes)
set local role authenticated;
select public.conectar();
select set_config('t.n', pg_temp.en_ruta('vg_a_centro')::text, true);
select public.avanzar_viaje(current_setting('t.n')::uuid, 'finalizado');
reset role;
select ok((select conectado_en is not null from public.perfiles where id = '00000000-0000-4000-a000-000000000035'),
  'R73: sin aviso, sigue conectado');

set local role authenticated;
select throws_ok($$ select public._despues_al_terminar() $$, '42501', null, 'R73: las funciones internas no se llaman desde la API');

select * from finish();
rollback;
