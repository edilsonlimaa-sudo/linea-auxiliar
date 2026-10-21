-- R69: el admin cierra viajes y desconecta choferes; nadie de la lista hacia Valle Grande pierde su lugar.
-- Cuentas propias (se deshacen al final): admin ...03 · choferes José ...47 (Centro → Valle), Luis ...48
-- (Valle → Centro) · pasajeros Ana ...72 (Gina), Rosa ...73 (camino), Beto ...74 (Valle → Centro)
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

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
create function pg_temp.lista() returns text language sql as $$
  select coalesce(string_agg(nombre, ', ' order by posicion), '') from public.lista_de_gina();
$$;

select public.crear_admin('prueba-viajes', 'una-clave-segura', '00000000-0000-4000-a000-000000000003');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000047', '0414-0000047', '{"rol": "chofer", "nombre": "José Rey", "placa": "JR047AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000048', '0414-0000048', '{"rol": "chofer", "nombre": "Luis Mar", "placa": "LM048AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000072', '0414-0000072', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000073', '0414-0000073', '{"rol": "pasajero", "nombre": "Rosa Tovar"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000074', '0414-0000074', '{"rol": "pasajero", "nombre": "Beto Díaz"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now()
 where id in ('00000000-0000-4000-a000-000000000047', '00000000-0000-4000-a000-000000000048', '00000000-0000-4000-a000-000000000072',
              '00000000-0000-4000-a000-000000000073', '00000000-0000-4000-a000-000000000074');
-- Sin la lista ni los viajes reales de la base local (todo se deshace al final)
delete from public.lista_gina;
update public.viajes set estado = 'cancelado' where sentido = 'centro_a_vg' and estado not in ('finalizado', 'cancelado');

set local role authenticated;

-- José llega a Gina; Ana (Gina) y Rosa (Plaza del Indio) se anotan; José sube a Ana
select pg_temp.yo('47');
select set_config('t.v1', public.publicar_viaje('centro_a_vg', 4, 5)::text, true);
reset role;
update public.viajes set estado = 'en_parada', estado_en = now() where id = current_setting('t.v1')::uuid;
set local role authenticated;
select pg_temp.yo('72');
select public.estoy_en_lista(true);
select pg_temp.yo('73');
select public.estoy_en_lista(false, 'Plaza del Indio');
select pg_temp.yo('47');
select public.subio_de_lista(l.id, current_setting('t.v1')::uuid) from public.lista_gina l where l.pasajero_id = '00000000-0000-4000-a000-000000000072';
select is(pg_temp.lista(), 'Rosa T.', 'Ana subió: sale de la lista');

-- Nadie más que el admin
select throws_ok(format($$ select public.admin_cerrar_viaje('%s') $$, current_setting('t.v1')), 'P0001',
  'Solo el administrador puede cerrar viajes', 'R69: el chofer no usa la función del admin');

-- El admin cierra el viaje antes de salir: se cancela y Ana vuelve a la lista en su lugar (primera)
select pg_temp.yo('03');
select lives_ok(format($$ select public.admin_cerrar_viaje('%s') $$, current_setting('t.v1')), 'R69: el admin cierra un viaje');
select is((select estado::text from public.viajes where id = current_setting('t.v1')::uuid), 'cancelado', 'R69: sin salir, se cancela');
select is(pg_temp.lista(), 'Ana P., Rosa T.', 'R69: quien subió en Gina vuelve a la lista en su mismo lugar');
select is((select estado::text from public.reservas where viaje_id = current_setting('t.v1')::uuid), 'sin_puesto',
  'R69: su puesto en ese carro se cierra');
select throws_ok(format($$ select public.admin_cerrar_viaje('%s') $$, current_setting('t.v1')), 'P0001',
  'Ese viaje ya está cerrado', 'R69: un viaje cerrado no se cierra otra vez');

-- José vuelve: guarda puesto a Rosa y sale (Ana no apareció); después avisa que no puede seguir
select pg_temp.yo('47');
select set_config('t.v2', public.publicar_viaje('centro_a_vg', 4, 5)::text, true);
reset role;
update public.viajes set estado = 'en_parada', estado_en = now() where id = current_setting('t.v2')::uuid;
set local role authenticated;
select public.avanzar_viaje(current_setting('t.v2')::uuid, 'en_ruta');
select is(pg_temp.lista(), 'Ana P.', 'R66: Rosa va con José');

-- El admin lo desconecta: el viaje en ruta se termina, Rosa vuelve a la lista y José queda "terminó por hoy"
select pg_temp.yo('03');
select lives_ok($$ select public.admin_desconectar('00000000-0000-4000-a000-000000000047') $$, 'R69: el admin desconecta a un chofer');
select is((select estado::text from public.viajes where id = current_setting('t.v2')::uuid), 'finalizado',
  'R69: el viaje en ruta se termina');
select is(pg_temp.lista(), 'Ana P., Rosa T.', 'R69: quien esperaba en el camino vuelve a la lista en su lugar');
reset role;
select is((select conectado_en is null from public.perfiles where id = '00000000-0000-4000-a000-000000000047')
          and exists (select 1 from public.pausas where chofer_id = '00000000-0000-4000-a000-000000000047'
                        and cerrada_en is null and vuelve_en is null), true,
  'R69: queda desconectado y "terminó por hoy" (R60)');
set local role authenticated;

-- Valle Grande → Centro: el que apartó queda sin puesto y el siguiente viaje de la cadena arranca (R24, R12)
select pg_temp.yo('48');
select set_config('t.v3', public.publicar_viaje('vg_a_centro', 4, 10)::text, true);
select set_config('t.v4', public.publicar_viaje('vg_a_centro', 4, 30)::text, true);
select pg_temp.yo('74');
select public.reservar(current_setting('t.v3')::uuid, 'Calle 3');
select pg_temp.yo('03');
select public.admin_cerrar_viaje(current_setting('t.v3')::uuid);
select is((select estado::text from public.reservas where viaje_id = current_setting('t.v3')::uuid), 'sin_puesto',
  'R69: quien apartó debe escoger otra unidad');
select is((select estado::text from public.viajes where id = current_setting('t.v4')::uuid), 'en_camino',
  'R69: el siguiente viaje de la cadena arranca');

select * from finish();
rollback;
