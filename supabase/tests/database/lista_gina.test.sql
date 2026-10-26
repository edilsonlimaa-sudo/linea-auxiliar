-- Pruebas de la Lista de Gina (docs/especificacion.md §5.17, R62–R68). Se ejecutan con:  npx supabase test db
-- Crean sus propias cuentas dentro de la transacción, que se deshace al final.
--   choferes: José ...45, Pedro ...46 · pasajeros: Ana ...64, Beto ...65, Rosa ...66 (camino), Carla ...67, Luis ...68 (grupo de 2), Marta ...69 (camino), Nora ...70 (camino, con los carros ya en ruta), Olga ...71 (en Gina, dice que se montó)
begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

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


select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000045', '0414-0000045', '{"rol": "chofer", "nombre": "José Rey", "placa": "JR045AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000046', '0414-0000046', '{"rol": "chofer", "nombre": "Pedro Gil", "placa": "PG046AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000064', '0414-0000064', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000065', '0414-0000065', '{"rol": "pasajero", "nombre": "Beto Díaz"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000066', '0414-0000066', '{"rol": "pasajero", "nombre": "Rosa Tovar"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000067', '0414-0000067', '{"rol": "pasajero", "nombre": "Carla Mora"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000068', '0414-0000068', '{"rol": "pasajero", "nombre": "Luis Lara"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000069', '0414-0000069', '{"rol": "pasajero", "nombre": "Marta Ruiz"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000070', '0414-0000070', '{"rol": "pasajero", "nombre": "Nora Vega"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-000000000071', '0414-0000071', '{"rol": "pasajero", "nombre": "Olga Paz"}');
update public.perfiles set estado = 'aprobado', aprobado_en = now() where id::text like '00000000-0000-4000-a000-0000000000%'
   and id::text between '00000000-0000-4000-a000-000000000045' and '00000000-0000-4000-a000-000000000071';
-- La lista empieza vacía en esta transacción (la base local puede tener avisos reales; todo se deshace al final)
delete from public.lista_gina;
-- …y sin otros carros en Gina ni hacia Valle Grande: el plan depende de quién llegó antes (R64). También se deshace
update public.viajes set estado = 'cancelado' where sentido = 'centro_a_vg' and estado not in ('finalizado', 'cancelado');

-- Atajo: quién soy
create function pg_temp.yo(p text) returns void language sql as $$
  select pg_temp.como('00000000-0000-4000-a000-0000000000' || p);
$$;
-- El plan de un carro, en una línea: "Ana:llamar Beto:llamar …"
create function pg_temp.plan(p_viaje text) returns text language sql as $$
  select string_agg(split_part(nombre, ' ', 1) || ':' || rol, ' ' order by posicion) from public.plan_de_gina(p_viaje::uuid);
$$;

set local role authenticated;

-- José publica Centro → Valle Grande (4 puestos): nadie puede apartar en él (R62)
select pg_temp.yo('45');
select set_config('t.jose', public.publicar_viaje('centro_a_vg', 4, 5)::text, true);
select pg_temp.yo('64');
select throws_ok($$ select public.reservar(current_setting('t.jose')::uuid, 'Gina') $$,
  'P0001', 'En Centro → Valle Grande no se aparta puesto: avisa que estás en Gina', 'R62: en Centro → Valle no se aparta');

-- Avisos: Ana, Beto (Gina), Rosa (Plaza del Indio), Carla (Gina), Luis con un acompañante (Gina)
select lives_ok($$ select public.estoy_en_lista(true, null, 9.745, -63.179, 1, 20) $$, 'R62: "Estoy en Gina"');
select throws_ok($$ select public.estoy_en_lista(true) $$, 'P0001', 'Ya estás en la lista', 'R62: una sola entrada activa');
select pg_temp.yo('65');
select public.estoy_en_lista(true);
select pg_temp.yo('66');
select throws_ok($$ select public.estoy_en_lista(false, null, 9.75, -63.18) $$, 'P0001', 'Escribe dónde estás esperando', 'R62/R26: en el camino, escribe dónde (el GPS solo no basta)');
select public.estoy_en_lista(false, 'Plaza del Indio');
select pg_temp.yo('67');
select public.estoy_en_lista(true);
select pg_temp.yo('68');
select throws_ok($$ select public.estoy_en_lista(true, null, null, null, 5) $$, 'P0001', 'Pueden ir de 1 a 4 personas por aviso', 'R62: de 1 a 4');
select public.estoy_en_lista(true, null, null, null, 2);

-- Todos ven la misma lista, en orden, con dónde está cada uno; la distancia no (R63)
select results_eq(
  $$ select posicion, nombre, personas, coalesce(lugar, 'Gina'), es_mio from public.lista_de_gina() $$,
  $$ values (1, 'Ana P.'::text, 1, 'Gina'::text, false), (2, 'Beto D.', 1, 'Gina', false), (3, 'Rosa T.', 1, 'Plaza del Indio', false),
            (4, 'Carla M.', 1, 'Gina', false), (5, 'Luis L.', 2, 'Gina', true) $$,
  'R63: una sola lista por orden de llegada, igual para todos');
select is((select count(*)::int from public.lista_gina_privado), 0, 'R63: el GPS y la distancia no los ven los pasajeros');
select throws_ok(format($$ select * from public.plan_de_gina('%s') $$, current_setting('t.jose')),
  'P0001', 'Solo los choferes pueden hacer esto', 'R64: el plan es del chofer');

-- La lista es del tramo: todos los choferes la ven, con dónde espera cada uno y el teléfono si están conectados (§5.17)
select throws_ok($$ select * from public.lista_para_choferes() $$, 'P0001', 'Solo los choferes pueden hacer esto',
  'R63: la lista con teléfonos es solo para choferes');
select pg_temp.yo('45');
select results_eq(
  $$ select nombre, coalesce(lugar, 'Gina'), telefono is not null from public.lista_para_choferes() $$,
  $$ values ('Ana P.'::text, 'Gina'::text, true), ('Beto D.', 'Gina', true), ('Rosa T.', 'Plaza del Indio', true),
            ('Carla M.', 'Gina', true), ('Luis L.', 'Gina', true) $$,
  'R63: el chofer conectado ve toda la lista, dónde espera cada uno y su teléfono');

-- José llega a Gina: llama a Ana, Beto y Carla y guarda 1 puesto para Rosa; el grupo de Luis no cabe (R64)
select pg_temp.yo('45');
select public.avanzar_viaje(current_setting('t.jose')::uuid, 'en_parada');
select is(pg_temp.plan(current_setting('t.jose')), 'Ana:llamar Beto:llamar Rosa:guardar Carla:llamar Luis:despues',
  'R64: el plan llama a los de Gina y guarda puesto a los del camino, en orden');
select is((select telefono from public.plan_de_gina(current_setting('t.jose')::uuid) where nombre = 'Ana P.'), '+584140000064',
  'R65: el chofer tiene el teléfono para llamar');

-- Pedro llega después a Gina: no repite lo que José llama o guarda (R64, dos carros a la vez)
reset role;
update public.viajes set estado_en = now() - interval '2 minutes' where id = current_setting('t.jose')::uuid;
set local role authenticated;
select pg_temp.yo('46');
select set_config('t.pedro', public.publicar_viaje('centro_a_vg', 4, 0)::text, true);
select is(pg_temp.plan(current_setting('t.pedro')), 'Luis:llamar', 'R64: el segundo carro arma su plan con lo que sigue');
select is((select count(*)::int from public.plan_de_gina(current_setting('t.pedro')::uuid) where rol = 'guardar'), 0,
  'R64: el segundo carro no le guarda puesto a quien ya guarda el primero (no salen los dos con un puesto vacío)');

-- Ana no aparece ("viene en camino"): José sube a Beto y a Carla; Ana sigue arriba (R65)
select pg_temp.yo('45');
select lives_ok(format($$ select public.subio_de_lista(l.id, '%s') from public.lista_gina l where pasajero_id = '00000000-0000-4000-a000-000000000065' $$,
  current_setting('t.jose')), 'R64: Subió en Gina');
select public.subio_de_lista(l.id, current_setting('t.jose')::uuid) from public.lista_gina l where pasajero_id = '00000000-0000-4000-a000-000000000067';
select is((select ocupados from public.viajes where id = current_setting('t.jose')::uuid), 2, 'R68: cada Subió ocupa su puesto en el carro');
select is(pg_temp.plan(current_setting('t.jose')), 'Ana:llamar Rosa:guardar Luis:despues', 'R65: quien no aparece sigue primero');

-- Con 2 libres y 1 guardado para Rosa, el grupo de Luis no cabe en José
select throws_ok(format($$ select public.subio_de_lista(l.id, '%s') from public.lista_gina l where pasajero_id = '00000000-0000-4000-a000-000000000068' $$,
  current_setting('t.jose')), 'P0001', 'No caben todos: el grupo espera el siguiente carro', 'R64: el grupo sube junto o no sube');

-- José sale: Rosa queda vinculada a su carro (reserva activa, "va por ti"); Ana vuelve a la lista (R66)
select public.avanzar_viaje(current_setting('t.jose')::uuid, 'en_ruta');
select results_eq(
  $$ select l.estado::text, r.estado::text, r.en_camino from public.lista_gina l join public.reservas r on r.id = l.reserva_id
      where l.pasajero_id = '00000000-0000-4000-a000-000000000066' $$,
  $$ values ('en_carro'::text, 'activa'::text, true) $$, 'R66: al salir, el del camino queda con su puesto en el carro');
select is((select string_agg(nombre, ', ' order by posicion) from public.lista_de_gina()), 'Ana P., Luis L.', 'R66: Ana sigue en la lista y Rosa ya no');
select is((select count(*)::int from public.reservas r join public.perfiles pf on pf.id = r.pasajero_id
            where pf.nombre = 'Rosa Tovar' and r.estado = 'activa' and r.viaje_id <> current_setting('t.jose')::uuid), 0,
  'R66: el puesto de Rosa queda en un solo carro (el que llegó primero)');
select is((select count(*)::int from public.reservas where viaje_id = current_setting('t.jose')::uuid and estado = 'subio'), 2,
  'R68: los que subieron en Gina van a bordo');

-- Ahora Pedro llama a Ana y a Luis
select pg_temp.yo('46');
select is(pg_temp.plan(current_setting('t.pedro')), 'Ana:llamar Luis:llamar', 'R66: el siguiente carro no guarda otra vez a Rosa');

-- En el camino: José recoge a Rosa (Subió de siempre) y a Marta, que avisó después de que salió (R67)
select pg_temp.yo('66');
select ok(public.puede_ver_telefono('00000000-0000-4000-a000-000000000045'), '§6: Rosa ve el teléfono de su chofer');
select pg_temp.yo('69');
select public.estoy_en_lista(false, 'Redoma de Juanico');
select pg_temp.yo('45');
select lives_ok(format($$ select public.marcar_subio(r.id) from public.reservas r where r.viaje_id = '%s' and r.pasajero_id = '00000000-0000-4000-a000-000000000066' $$,
  current_setting('t.jose')), 'R66: el del camino sube con el Subió de siempre');
select lives_ok(format($$ select public.subio_de_lista(l.id, '%s') from public.lista_gina l where pasajero_id = '00000000-0000-4000-a000-000000000069' $$,
  current_setting('t.jose')), 'R67: en ruta, sube a quien avisó en el camino');
select is((select ocupados from public.viajes where id = current_setting('t.jose')::uuid), 4, 'R67: el carro va completo');

-- Teléfono de quien espera: Pedro (conectado) lo ve; otra pasajera no (§6)
select pg_temp.yo('46');
select ok(public.puede_ver_telefono('00000000-0000-4000-a000-000000000068'), '§6: el chofer conectado ve el teléfono de quien espera');
select pg_temp.yo('64');
select ok(not public.puede_ver_telefono('00000000-0000-4000-a000-000000000068'), '§6: otro pasajero no');

-- Pedro marca "No estaba" a Ana; Luis se va: la lista queda vacía (R62, R65)
select pg_temp.yo('46');
select public.no_estaba_en_lista(l.id) from public.lista_gina l where pasajero_id = '00000000-0000-4000-a000-000000000064' and estado = 'esperando';
select pg_temp.yo('68');
select throws_ok($$ select public.me_fui('aburrido') $$, 'P0001', 'Motivo no válido', 'R62: solo los motivos de la lista');
select lives_ok($$ select public.me_fui('van') $$, 'R62: "Me fui" diciendo cómo se va');
reset role;
select is((select lp.motivo_salida from public.lista_gina_privado lp join public.lista_gina l on l.id = lp.id
            where l.pasajero_id = '00000000-0000-4000-a000-000000000068' and l.estado = 'se_fue'), 'van',
  'R62: queda guardado que se fue en la van');
set local role authenticated;
select is((select count(*)::int from public.lista_de_gina()), 0, 'R62/R65: No estaba y Me fui sacan de la lista');

-- Nora avisa en el camino con los dos carros ya en ruta: José va lleno; Pedro dice "Voy" y la lleva (R67)
select public.avanzar_viaje(current_setting('t.pedro')::uuid, 'en_ruta') from (select pg_temp.yo('46')) x;
select pg_temp.yo('70');
select public.estoy_en_lista(false, 'Las Cocuizas');
select pg_temp.yo('45');
select throws_ok(format($$ select public.voy_por_el(l.id, '%s') from public.lista_gina l where pasajero_id = '00000000-0000-4000-a000-000000000070' $$,
  current_setting('t.jose')), 'P0001', 'Vas lleno', 'R67: "Voy" solo si cabe en el carro');
select pg_temp.yo('46');
select lives_ok(format($$ select public.voy_por_el(l.id, '%s') from public.lista_gina l where pasajero_id = '00000000-0000-4000-a000-000000000070' $$,
  current_setting('t.pedro')), 'R67: "Voy": el chofer en ruta toma a quien espera en el camino');
select results_eq(
  $$ select l.estado::text, r.estado::text, r.en_camino, r.lugar from public.lista_gina l join public.reservas r on r.id = l.reserva_id
      where l.pasajero_id = '00000000-0000-4000-a000-000000000070' $$,
  $$ values ('en_carro'::text, 'activa'::text, true, 'Las Cocuizas'::text) $$, 'R67: queda ligada al carro, como al salir de Gina');
select is((select count(*)::int from public.lista_de_gina()), 0, 'R67: sale de la lista (y del aviso de los demás choferes)');
select throws_ok(format($$ select public.voy_por_el(l.id, '%s') from public.lista_gina l where pasajero_id = '00000000-0000-4000-a000-000000000070' $$,
  current_setting('t.pedro')), 'P0001', 'Esa persona ya no está en la lista: otro carro va por ella o se fue', 'R67: el primero que dice "Voy" se la lleva');

-- Olga se montó con Pedro en Gina sin que él la marcara; ya en ruta, toca "Me monté" (no "Me fui") y él la marca (R62)
select pg_temp.yo('71');
select public.estoy_en_lista(true);
select pg_temp.yo('46');
select throws_ok(format($$ select public.subio_de_lista(l.id, '%s') from public.lista_gina l where pasajero_id = '00000000-0000-4000-a000-000000000071' $$,
  current_setting('t.pedro')), 'P0001', 'Ya saliste de Gina', 'R67: en ruta no se sube a alguien de Gina…');
select pg_temp.yo('71');
select lives_ok($$ select public.me_monte() $$, 'R62: "Me monté en un carro de la línea"');
select is((select dice_que_subio from public.lista_de_gina() where es_mio), true, 'R62: sigue en la lista, marcada "dice que se montó"');
select pg_temp.yo('46');
select lives_ok(format($$ select public.subio_de_lista(l.id, '%s') from public.lista_gina l where pasajero_id = '00000000-0000-4000-a000-000000000071' $$,
  current_setting('t.pedro')), 'R62: …salvo que diga que ya se montó');
select pg_temp.yo('71');
select throws_ok($$ select public.me_monte() $$, 'P0001', 'Ya no estás en la lista', 'R62: "Me monté" solo estando en la lista');

-- La API corre las funciones "stable" en modo solo lectura: ninguna puede bloquear filas (FOR UPDATE) ni llamar a
-- _mi_viaje / _reserva, que las bloquean (así falló plan_de_gina en el app aunque las demás pruebas pasaban)
reset role;
select is(
  (select string_agg(p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.provolatile = 's'
      and (p.prosrc ~* 'for\s+update' or p.prosrc ~* '_mi_viaje\s*\(' or p.prosrc ~* '_reserva\s*\(')),
  null, 'Ninguna función stable bloquea filas');

select * from finish();
rollback;
