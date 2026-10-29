-- R24 (interfaz nueva): el pasajero de un viaje cancelado ve quién lo cerró y el motivo, nunca el detalle escrito; otro
-- pasajero no ve nada. Cuentas propias (se deshacen al final): chofer Raúl ...f1 · pasajeras Ana ...f2 y Bea ...f3
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

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

select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f1', '0414-00000f1', '{"rol": "chofer", "nombre": "Raúl Real", "placa": "AV0F1AA"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f2', '0414-00000f2', '{"rol": "pasajero", "nombre": "Ana Pérez"}');
select pg_temp.crear_cuenta('00000000-0000-4000-a000-0000000000f3', '0414-00000f3', '{"rol": "pasajero", "nombre": "Bea Díaz"}');

-- Un viaje cancelado por el chofer, con la reserva de Ana (como lo deja cancelar_viaje)
set local session_replication_role = replica;
insert into public.viajes (id, chofer_id, sentido, puestos, eta_min, estado)
values ('00000000-0000-4000-c000-0000000000f1', '00000000-0000-4000-a000-0000000000f1', 'vg_a_centro', 4, 10, 'cancelado');
insert into public.reservas (id, viaje_id, pasajero_id, estado, cerrada_en)
values ('00000000-0000-4000-d000-0000000000f1', '00000000-0000-4000-c000-0000000000f1', '00000000-0000-4000-a000-0000000000f2', 'sin_puesto', now());
insert into public.viaje_cierres (viaje_id, por, motivo, detalle)
values ('00000000-0000-4000-c000-0000000000f1', 'chofer', 'carro', 'Se me pinchó un caucho en la redoma');
set local session_replication_role = origin;

set local role authenticated;

select pg_temp.yo('f2');
select results_eq($$ select por, motivo from public.motivo_de_cierre('00000000-0000-4000-d000-0000000000f1') $$,
  $$ values ('chofer'::text, 'carro'::text) $$, 'el pasajero de ese viaje ve quién lo cerró y el motivo');
select is_empty($$ select detalle from public.viaje_cierres $$,'el detalle escrito no lo lee el pasajero (RLS)');

select pg_temp.yo('f3');
select is_empty($$ select * from public.motivo_de_cierre('00000000-0000-4000-d000-0000000000f1') $$, 'otro pasajero no ve nada');

reset role;
select is((select count(*)::int from public.viaje_cierres where viaje_id = '00000000-0000-4000-c000-0000000000f1'), 1, 'el cierre sigue guardado');

select * from finish();
rollback;
