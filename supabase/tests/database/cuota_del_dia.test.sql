-- §5.18 Cuota del día (R76–R78): publicar pide el día pagado; el primer aviso habilita en revisión; rechazado no.
-- Cuentas propias (se deshacen al final): admin ...04 · choferes Pedro ...49, Luisa ...50 · pasajera Ana ...77
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

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
create function pg_temp.habilitado() returns boolean language sql as $$ select habilitado from public.cuota_de_hoy() $$;
create function pg_temp.aviso_de(p text) returns uuid language sql as $$
  select id from public.cuota_pagos where chofer_id = ('00000000-0000-4000-a000-0000000000' || p)::uuid order by estado <> 'rechazado' desc, creado_en desc limit 1
$$;

select public.crear_admin('prueba-cuota', 'una-clave-segura', '00000000-0000-4000-a000-000000000004');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000049', '0414-0000049', '{"rol": "chofer", "nombre": "Pedro Lira", "placa": "PL049AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000050', '0414-0000050', '{"rol": "chofer", "nombre": "Luisa Mata", "placa": "LM050AA"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now()
 where id in ('00000000-0000-4000-a000-000000000049', '00000000-0000-4000-a000-000000000050');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000077', '0414-0000077', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now() where id = '00000000-0000-4000-a000-000000000077';
-- Sin la lista real de la base local (todo se deshace al final)
delete from public.lista_gina;
update public.cuota_config set activa = false, banco = null, telefono = null, cedula = null;

set local role authenticated;

-- Sin cuota activa, todo como antes
select pg_temp.yo('49');
select lives_ok($$ select public.publicar_viaje('vg_a_centro', 4, 10) $$, 'R76: sin cuota activa se publica como siempre');
select public.cancelar_viaje(id) from public.viajes where chofer_id = auth.uid() and estado not in ('finalizado', 'cancelado');

-- El admin activa la cuota desde hoy: primero tiene que cargar su Pago Móvil
select pg_temp.yo('04');
select throws_ok($$ select public.admin_guardar_cuota(true, (now() at time zone 'America/Caracas')::date, 1000, null, null, null) $$,
  'P0001', 'Carga tu Pago Móvil antes de activar la cuota', 'R78: sin Pago Móvil no se activa');
select lives_ok($$ select public.admin_guardar_cuota(true, (now() at time zone 'America/Caracas')::date, 1000, '0102', '04141234567', 'V12345678') $$,
  'R78: el admin activa la cuota con su Pago Móvil');
select pg_temp.yo('49');
select throws_ok($$ select public.admin_guardar_cuota(false, current_date, 1000, null, null, null) $$,
  'P0001', 'Solo el administrador cambia la cuota', 'R78: un chofer no cambia la cuota');

-- Sin pagar no publica
select is((select rige and not habilitado from public.cuota_de_hoy()), true, 'R76: hoy se cobra y Pedro no está habilitado');
select throws_ok($$ select public.publicar_viaje('vg_a_centro', 4, 10) $$,
  'P0001', 'Para publicar hoy, paga la cuota del día y avisa la referencia del Pago Móvil', 'R76: sin pagar no publica');

-- Sin pagar tampoco se conecta ni ve la lista hacia Valle Grande (Ana espera en Gina)
select throws_ok($$ select public.conectar() $$,
  'P0001', 'Para conectarte hoy, paga la cuota del día y avisa la referencia del Pago Móvil', 'R76: sin pagar no se conecta');
select pg_temp.yo('77');
select public.estoy_en_lista(true);
select is((select count(*)::int from public.lista_de_gina()), 1, 'R76: la pasajera sigue viendo la lista');
select pg_temp.yo('49');
select is((select count(*)::int from public.lista_para_choferes()), 0, 'R76: sin pagar, el chofer no ve la lista (ni teléfonos)');
select is((select count(*)::int from public.lista_de_gina()), 0, 'R76: sin pagar, tampoco la lista pública');

-- Avisa el pago: el primero del día habilita al momento
select throws_ok($$ select public.avisar_pago_cuota('12', '0134') $$,
  'P0001', 'Escribe la referencia del Pago Móvil (solo números)', 'R77: la referencia tiene de 4 a 20 números');
select lives_ok($$ select public.avisar_pago_cuota('0012-3456', '0134') $$, 'R77: Pedro avisa su pago');
select is((select referencia || '|' || estado || '|' || habilita || '|' || monto from public.cuota_pagos where id = pg_temp.aviso_de('49')),
  '00123456|revision|true|1000.00', 'R77: el primer aviso queda en revisión, habilita y guarda el monto');
select lives_ok($$ select public.publicar_viaje('vg_a_centro', 4, 10) $$, 'R77: en revisión ya publica');
select is((select count(*)::int from public.lista_para_choferes()), 1, 'R77: con la cuota, ve la lista');
select throws_ok($$ select public.avisar_pago_cuota('99999999', '0134') $$,
  'P0001', 'Ya avisaste tu pago de hoy', 'R77: un aviso a la vez');

-- Luisa no ve el aviso de Pedro
select pg_temp.yo('50');
select is((select count(*)::int from public.cuota_pagos), 0, 'Privacidad: cada chofer ve solo sus avisos');

-- El admin rechaza: Pedro no publica más hoy, aunque lo ya publicado sigue
select pg_temp.yo('04');
select public.admin_decidir_pago(pg_temp.aviso_de('49'), false, 'No aparece en el banco');
select pg_temp.yo('49');
select throws_ok($$ select public.publicar_viaje('centro_a_vg', 4, 30) $$,
  'P0001', 'Para publicar hoy, paga la cuota del día y avisa la referencia del Pago Móvil', 'R77: rechazado no publica más ese día');
select is((select count(*)::int from public.viajes where chofer_id = auth.uid() and estado not in ('finalizado', 'cancelado')), 1,
  'R77: lo ya publicado sigue');

-- Otro aviso el mismo día ya no habilita hasta que el admin lo apruebe
select public.avisar_pago_cuota('55556666', '0102');
select is(pg_temp.habilitado(), false, 'R77: el segundo aviso del día no habilita en revisión');
select pg_temp.yo('04');
select throws_ok(format($$ select public.admin_decidir_pago(%L, true) $$,
  (select id from public.cuota_pagos where chofer_id = '00000000-0000-4000-a000-000000000049' and estado = 'rechazado')),
  'P0001', 'Ese chofer ya tiene otro aviso ese día: decide ese', 'R78: no se aprueban dos avisos del mismo día');
select public.admin_decidir_pago(pg_temp.aviso_de('49'), true);
select pg_temp.yo('49');
select is(pg_temp.habilitado(), true, 'R78: aprobado, vuelve a publicar');
select lives_ok($$ select public.publicar_viaje('centro_a_vg', 4, 30) $$, 'R78: aprobado publica');

select * from finish();
rollback;
