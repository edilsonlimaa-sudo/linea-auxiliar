-- =====================================================================================
-- Cronómetro del viaje (docs/especificacion.md R56): cada cambio de estado con su hora y lo prometido.
-- Lo graba un trigger; solo el admin lo lee.
-- =====================================================================================

create table public.viaje_eventos (
  id        bigint generated always as identity primary key,
  viaje_id  uuid not null references public.viajes (id) on delete cascade,
  estado    public.estado_viaje not null,
  eta_min   int,                                          -- lo que el chofer había prometido en ese momento
  en        timestamptz not null default clock_timestamp()
);
create index viaje_eventos_por_viaje on public.viaje_eventos (viaje_id, en);

alter table public.viaje_eventos enable row level security;
create policy "viaje_eventos: solo admin" on public.viaje_eventos
  for select to authenticated using (public.es_admin());
grant select on public.viaje_eventos to authenticated;

-- Al publicar y a cada cambio de estado
create function public._registrar_evento_viaje()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    insert into public.viaje_eventos (viaje_id, estado, eta_min) values (new.id, new.estado, new.eta_min);
  end if;
  return new;
end;
$$;
revoke execute on function public._registrar_evento_viaje() from anon, public, authenticated;

create trigger viajes_eventos
after insert or update of estado on public.viajes
for each row execute function public._registrar_evento_viaje();

-- Viajes anteriores: lo poco que se sabe (salida y llegada)
insert into public.viaje_eventos (viaje_id, estado, en)
select id, 'en_ruta'::public.estado_viaje, salida_en from public.viajes where salida_en is not null
union all
select id, 'finalizado'::public.estado_viaje, llegada_en from public.viajes where llegada_en is not null and estado = 'finalizado';
