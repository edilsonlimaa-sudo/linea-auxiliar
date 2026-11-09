-- Viajes gratis (docs/especificacion.md §5.26, R102–R105): el admin regala viajes a un pasajero; el pasajero decide
-- con qué viaje pagar (a bordo, junto al Pago Móvil); el chofer ve en su lista quién pagó así.

-- R102: los regalos (cuántos y por qué). No vencen.
create table public.viajes_gratis (
  id          uuid primary key default gen_random_uuid(),
  pasajero_id uuid not null references public.perfiles (id) on delete cascade,
  cantidad    int not null check (cantidad between 1 and 10),
  motivo      text not null check (char_length(motivo) between 2 and 80),
  creado_por  uuid references public.perfiles (id) on delete set null,
  creado_en   timestamptz not null default now()
);
create index viajes_gratis_por_pasajero on public.viajes_gratis (pasajero_id);

alter table public.viajes_gratis enable row level security;
create policy "viajes_gratis: propios o admin" on public.viajes_gratis
  for select to authenticated using (pasajero_id = auth.uid() or public.es_admin());
revoke all on public.viajes_gratis from anon, authenticated;
grant select on public.viajes_gratis to authenticated;

-- R103/R105: la reserva que pagó con un viaje gratis. Lo leen quienes ya leen la reserva (él, el chofer del viaje, el admin)
alter table public.reservas add column gratis boolean not null default false;

-- R104: le quedan = regalados − reservas pagadas con viaje gratis en que viajó (si el viaje se cancela, vuelve)
create function public._saldo_gratis(p_pasajero uuid)
returns int language sql stable security definer set search_path = '' as $$
  select (coalesce((select sum(cantidad) from public.viajes_gratis where pasajero_id = p_pasajero), 0)
        - (select count(*) from public.reservas r join public.viajes v on v.id = r.viaje_id
            where r.pasajero_id = p_pasajero and r.gratis and r.estado in ('subio', 'bajo')
              and v.estado <> 'cancelado'))::int;
$$;
revoke execute on function public._saldo_gratis(uuid) from anon, authenticated, public;

-- El pasajero: cuántos le quedan
create function public.mis_viajes_gratis()
returns int language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  return public._saldo_gratis(auth.uid());
end;
$$;
revoke execute on function public.mis_viajes_gratis() from anon, public;
grant execute on function public.mis_viajes_gratis() to authenticated;

-- R103: a bordo, paga su pasaje con un viaje gratis. Como un pago: no se deshace
create function public.usar_viaje_gratis(p_reserva uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_yo uuid := auth.uid();
  r public.reservas;
  v_estado_viaje public.estado_viaje;
begin
  if v_yo is null then raise exception 'Inicia sesión'; end if;
  -- Un pasajero a la vez: dos toques seguidos no gastan dos veces el mismo viaje
  perform 1 from public.perfiles where id = v_yo for update;
  select * into r from public.reservas where id = p_reserva and pasajero_id = v_yo for update;
  if not found then raise exception 'No encontramos tu reserva'; end if;
  if r.gratis then return; end if;
  select estado into v_estado_viaje from public.viajes where id = r.viaje_id;
  if v_estado_viaje in ('finalizado', 'cancelado') or r.estado not in ('activa', 'subio') then
    raise exception 'Este viaje ya terminó';
  end if;
  if r.estado <> 'subio' then raise exception 'Podrás pagar con tu viaje gratis cuando vayas a bordo'; end if;
  if public._saldo_gratis(v_yo) < 1 then raise exception 'No te quedan viajes gratis'; end if;
  update public.reservas set gratis = true where id = r.id;
end;
$$;
revoke execute on function public.usar_viaje_gratis(uuid) from anon, public;
grant execute on function public.usar_viaje_gratis(uuid) to authenticated;

-- R102: el admin regala
create function public.admin_regalar_viajes(p_pasajero uuid, p_cantidad int, p_motivo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_id uuid;
begin
  if not public.es_admin() then raise exception 'Solo el administrador regala viajes'; end if;
  if not exists (select 1 from public.perfiles where id = p_pasajero and rol = 'pasajero') then
    raise exception 'Solo se regalan viajes a pasajeros';
  end if;
  if p_cantidad is null or p_cantidad not between 1 and 10 then raise exception 'Escoge entre 1 y 10 viajes'; end if;
  if char_length(v_motivo) < 2 then raise exception 'Escribe el motivo del regalo'; end if;
  if char_length(v_motivo) > 80 then raise exception 'El motivo es muy largo (máximo 80 letras)'; end if;
  insert into public.viajes_gratis (pasajero_id, cantidad, motivo, creado_por)
  values (p_pasajero, p_cantidad, v_motivo, auth.uid()) returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.admin_regalar_viajes(uuid, int, text) from anon, public;
grant execute on function public.admin_regalar_viajes(uuid, int, text) to authenticated;

-- R102: quitar un regalo mal puesto, solo si no deja el saldo en negativo (no se usó)
create function public.admin_quitar_regalo(p_regalo uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  g public.viajes_gratis;
begin
  if not public.es_admin() then raise exception 'Solo el administrador quita regalos'; end if;
  select * into g from public.viajes_gratis where id = p_regalo;
  if not found then raise exception 'Ese regalo ya no existe'; end if;
  perform 1 from public.perfiles where id = g.pasajero_id for update;
  if public._saldo_gratis(g.pasajero_id) < g.cantidad then
    raise exception 'Ya usó parte de esos viajes: no se puede quitar';
  end if;
  delete from public.viajes_gratis where id = p_regalo;
end;
$$;
revoke execute on function public.admin_quitar_regalo(uuid) from anon, public;
grant execute on function public.admin_quitar_regalo(uuid) to authenticated;

-- R102: cuántos le quedan a un pasajero (para el detalle del admin)
create function public.admin_saldo_gratis(p_pasajero uuid)
returns int language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador ve esto'; end if;
  return public._saldo_gratis(p_pasajero);
end;
$$;
revoke execute on function public.admin_saldo_gratis(uuid) from anon, public;
grant execute on function public.admin_saldo_gratis(uuid) to authenticated;
