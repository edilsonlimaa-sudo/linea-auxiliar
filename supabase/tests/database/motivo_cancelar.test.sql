-- R72: por qué se cancela y quién cerró. Cuentas propias (se deshacen al final): choferes Rita ...42 y Tomás ...43,
-- pasajero Leo ...76
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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

select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000042', '0414-0000042', '{"rol": "chofer", "nombre": "Rita Mora", "placa": "RM042AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000043', '0414-0000043', '{"rol": "chofer", "nombre": "Tomás Gil", "placa": "TG043AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000076', '0414-0000076', '{"rol": "pasajero", "nombre": "Leo Paz"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now()
 where id in ('00000000-0000-4000-a000-000000000042', '00000000-0000-4000-a000-000000000043', '00000000-0000-4000-a000-000000000076');

set local role authenticated;
select pg_temp.yo('42');
select set_config('t.v1', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);

select throws_ok(format($$ select public.cancelar_viaje('%s', 'porque_si') $$, current_setting('t.v1')), 'P0001', 'Motivo no válido',
  'R72: solo los motivos de la lista');
select lives_ok(format($$ select public.cancelar_viaje('%s', 'otra', '  Se me pinchó un caucho  ') $$, current_setting('t.v1')),
  'R72: el chofer cancela con su motivo');
select results_eq(format($$ select por, motivo, detalle from public.viaje_cierres where viaje_id = '%s' $$, current_setting('t.v1')),
  $$ values ('chofer', 'otra', 'Se me pinchó un caucho') $$, 'R72: queda quién, por qué y el detalle');

-- El chofer ve el suyo; otro chofer y los pasajeros, no
select is((select count(*)::int from public.viaje_cierres), 1, 'R72: el chofer ve el cierre de su viaje');
select pg_temp.yo('43');
select is((select count(*)::int from public.viaje_cierres), 0, 'R72: otro chofer no lo ve');
select pg_temp.yo('76');
select is((select count(*)::int from public.viaje_cierres), 0, 'R72: un pasajero no lo ve');

-- Sin motivo (app vieja) igual cancela, y el detalle solo se guarda con "otra"
select pg_temp.yo('42');
select set_config('t.v2', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);
select public.cancelar_viaje(current_setting('t.v2')::uuid, 'nadie', 'esto no se guarda');
select results_eq(format($$ select motivo, detalle from public.viaje_cierres where viaje_id = '%s' $$, current_setting('t.v2')),
  $$ values ('nadie'::text, null::text) $$, 'R72: el detalle es solo para "otra razón"');

-- Al desconectarse se cancela lo publicado y queda quién
select set_config('t.v3', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);
select public.desconectar();
select is((select por from public.viaje_cierres where viaje_id = current_setting('t.v3')::uuid), 'chofer_desconectar',
  'R72: al desconectarse queda que fue el chofer al desconectarse');

select throws_ok($$ select public._registrar_cierre(gen_random_uuid(), 'chofer') $$, '42501', null, 'R72: la función interna no se llama desde la API');

select * from finish();
rollback;
