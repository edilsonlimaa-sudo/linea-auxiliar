-- §5.23 R90: avisos en el celular. Cada uno inscribe y quita sus aparatos; solo el admin lee los de los destinatarios.
-- Cuentas propias (se deshacen al final): admin ...09 · pasajeras Ana ...c1 (nueva) y Bea ...c2 (nueva)
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create function pg_temp.crear_cuenta(p_id uuid, p_telefono text, p_datos jsonb)
returns void language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', public.correo_de_telefono(p_telefono),
          extensions.crypt('123456', extensions.gen_salt('bf')), now(),
          '{"provider": "email", "providers": ["email"]}', p_datos || jsonb_build_object('telefono', p_telefono), now(), now());
  update public.perfiles set estado = 'aprobado', aprobado_en = now(), interfaz = 'nueva' where id = p_id;
end;
$$;
create function pg_temp.yo(p text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-0000000000' || p, 'role', 'authenticated')::text, true);
$$;

select public.crear_admin('prueba-push', 'una-clave-segura', '00000000-0000-4000-a000-000000000009');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000c1', '0414-00000c1', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000c2', '0414-00000c2', '{"rol": "pasajero", "nombre": "Bea Díaz"}');

set local role authenticated;

select pg_temp.yo('c1');
select throws_ok($$ select public.guardar_suscripcion('http://no-es-push', 'k', 'a') $$,
  'P0001', 'Este teléfono no dio los datos para avisarte', 'R90: solo direcciones de un servicio de push');
select public.guardar_suscripcion('https://push.ejemplo/ana-1', 'clave', 'secreto');
select public.guardar_suscripcion('https://push.ejemplo/compartido', 'clave', 'secreto');
select is((select count(*)::int from public.push_suscripciones), 2, 'R90: Ana activó dos aparatos');

select pg_temp.yo('c2');
select is((select count(*)::int from public.push_suscripciones), 0, 'R90: Bea no ve los aparatos de Ana');
select throws_ok($$ select * from public.admin_suscripciones_de(gen_random_uuid()) $$,
  'P0001', 'Solo el administrador manda avisos', 'R90: solo el admin lee los aparatos de los destinatarios');
-- Bea entra en el teléfono que usaba Ana y lo activa: el aparato pasa a ella
select public.guardar_suscripcion('https://push.ejemplo/compartido', 'clave2', 'secreto2');
select is((select count(*)::int from public.push_suscripciones), 1, 'R90: un aparato es de una sola cuenta: pasa a quien lo activó');

select pg_temp.yo('09');
create temp table enviada as
  select * from public.admin_enviar_notificacion('aviso', 'Hola', 'Prueba', array['00000000-0000-4000-a000-0000000000c1']::uuid[]);
select is((select array_agg(endpoint order by endpoint) from public.admin_suscripciones_de((select id from enviada))),
  array['https://push.ejemplo/ana-1'], 'R90: el aviso va solo a los aparatos de los destinatarios');
select public.admin_registrar_push((select id from enviada), 1, array['https://push.ejemplo/ana-1']);
select is((select push_enviados from public.admin_notificaciones() where id = (select id from enviada)), 1,
  'R90: el panel cuenta los celulares que recibieron el aviso');

select pg_temp.yo('c1');
select is((select count(*)::int from public.push_suscripciones), 0, 'R90: un aparato caducado se borra al mandar');

select pg_temp.yo('c2');
select public.quitar_suscripcion('https://push.ejemplo/compartido');
select is((select count(*)::int from public.push_suscripciones), 0, 'R90: desactivar quita el aparato');
select lives_ok($$ select public.quitar_suscripcion('https://push.ejemplo/no-existe') $$, 'R90: quitar uno que no está no falla');

select * from finish();
rollback;
