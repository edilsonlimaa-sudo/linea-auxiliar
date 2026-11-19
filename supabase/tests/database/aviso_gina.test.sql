-- §5.30 R116: al avisar que llega a Gina y al llegar, push a quienes esperan en la lista, con su lugar y si les toca.
-- Cuentas propias (se deshacen al final): choferes Raúl ...f1 y Simón ...f2 · pasajeras Ana ...f3 (Gina, 1, con avisos),
-- Bea ...f4 (Gina, 2 personas, con avisos), Cris ...f5 (en el camino, 1, con avisos) y Dora ...f6 (Gina, 1, sin avisos)
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
  update public.perfiles set estado = 'aprobado', aprobado_en = now() where id = p_id;
end;
$$;
create function pg_temp.yo(p text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-4000-a000-0000000000' || p, 'role', 'authenticated')::text, true);
$$;
-- Lo que devolvió el aviso, en una línea: "Ana:1:llamar Bea:2:despues …"
create temp table avisados (persona_id uuid, lugar int, rol text);
grant select, insert, delete on avisados to authenticated;
create function pg_temp.resumen() returns text language sql as $$
  select string_agg(split_part(p.nombre, ' ', 1) || ':' || a.lugar || ':' || a.rol, ' ' order by a.lugar)
    from avisados a join public.perfiles p on p.id = a.persona_id;
$$;

select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f1', '0414-00000f1', '{"rol": "chofer", "nombre": "Raúl Real", "placa": "AV0F1AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f2', '0414-00000f2', '{"rol": "chofer", "nombre": "Simón Otro", "placa": "AV0F2AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f3', '0414-00000f3', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f4', '0414-00000f4', '{"rol": "pasajero", "nombre": "Bea Díaz"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f5', '0414-00000f5', '{"rol": "pasajero", "nombre": "Cris Mora"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f6', '0414-00000f6', '{"rol": "pasajero", "nombre": "Dora Paz"}');
update public.cuota_config set activa = false where true;
-- La lista y Gina empiezan vacías en esta transacción (la base local puede tener datos reales; todo se deshace al final)
delete from public.lista_gina;
update public.viajes set estado = 'cancelado' where sentido = 'centro_a_vg' and estado not in ('finalizado', 'cancelado');

set local role authenticated;

-- Raúl publica Centro → Valle Grande con 2 puestos
select pg_temp.yo('f1');
select set_config('t.raul', public.publicar_viaje('centro_a_vg', 2, 10)::text, true);

-- En orden: Ana (Gina), Bea con acompañante (Gina), Cris (en el camino), Dora (Gina, sin avisos)
select pg_temp.yo('f3');
select public.guardar_suscripcion('https://push.ejemplo/ana', 'clave', 'secreto');
select public.estoy_en_lista(true);
select pg_temp.yo('f4');
select public.guardar_suscripcion('https://push.ejemplo/bea', 'clave', 'secreto');
select public.estoy_en_lista(true, null, null, null, 2);
select pg_temp.yo('f5');
select public.guardar_suscripcion('https://push.ejemplo/cris', 'clave', 'secreto');
select public.estoy_en_lista(false, 'Plaza del Indio');
select pg_temp.yo('f6');
select public.estoy_en_lista(true);

select throws_ok($$ select * from public.avisar_gina(current_setting('t.raul')::uuid) $$, 'P0001', null,
  'R116: solo un chofer avisa');

-- En camino todavía no avisa
select pg_temp.yo('f1');
select is((select count(*)::int from public.avisar_gina(current_setting('t.raul')::uuid)), 0,
  'R116: en camino no avisa (solo al avisar que llega y al llegar)');

-- Avisa que llega: a todos los de la lista con avisos; le toca a Ana (cabe), a Bea no (2 no caben en el puesto que queda),
-- Cris cabe en el camino (guardar); Dora no tiene avisos
select public.avanzar_viaje(current_setting('t.raul')::uuid, 'llegando');
insert into avisados select persona_id, lugar, rol from public.avisar_gina(current_setting('t.raul')::uuid);
select is(pg_temp.resumen(), 'Ana:1:llamar Bea:2:despues Cris:3:guardar', 'R116: cada uno con su lugar en la lista y si le toca');
select is((select count(*)::int from public.avisar_gina(current_setting('t.raul')::uuid)), 0, 'R116: una sola vez por paso');

-- Otro chofer no avisa por el viaje de Raúl
select pg_temp.yo('f2');
select is((select count(*)::int from public.avisar_gina(current_setting('t.raul')::uuid)), 0, 'R116: solo por su propio viaje');

-- Ya llegó: avisa de nuevo, una vez
select pg_temp.yo('f1');
select public.avanzar_viaje(current_setting('t.raul')::uuid, 'en_parada');
delete from avisados;
insert into avisados select persona_id, lugar, rol from public.avisar_gina(current_setting('t.raul')::uuid);
select is(pg_temp.resumen(), 'Ana:1:llamar Bea:2:despues Cris:3:guardar', 'R116: al llegar, avisa otra vez');
select is((select count(*)::int from public.avisar_gina(current_setting('t.raul')::uuid)), 0, 'R116: al llegar, una sola vez');

-- Ana subió: si Raúl tocara de nuevo, ya no hay paso nuevo que avisar
select public.subio_de_lista((select id from public.lista_gina where pasajero_id = '00000000-0000-4000-a000-0000000000f3' and estado = 'esperando'),
  current_setting('t.raul')::uuid);
select is((select count(*)::int from public.avisar_gina(current_setting('t.raul')::uuid)), 0, 'R116: subir no repite el aviso');

-- En ruta ya no avisa
select public.avanzar_viaje(current_setting('t.raul')::uuid, 'en_ruta');
select is((select count(*)::int from public.avisar_gina(current_setting('t.raul')::uuid)), 0, 'R116: en ruta no avisa');

-- Un viaje al Centro nunca avisa a la lista
select set_config('t.centro', public.publicar_viaje('vg_a_centro', 4, 0)::text, true);
select is((select count(*)::int from public.avisar_gina(current_setting('t.centro')::uuid)), 0, 'R116: solo Centro → Valle Grande');

reset role;
select is((select count(*)::int from public.avisos_gina where viaje_id = current_setting('t.raul')::uuid), 2,
  'R116: quedan anotados los dos pasos avisados');

select * from finish();
rollback;
