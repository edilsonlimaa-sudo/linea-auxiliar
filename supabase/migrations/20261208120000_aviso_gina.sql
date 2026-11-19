-- Parada Gina: esperar en la plaza (docs/especificacion.md §5.30, R116). Cuando el chofer de un viaje hacia Valle Grande
-- avisa que llega a Gina y cuando ya llegó, la base devuelve los aparatos de quienes esperan en la lista, cada uno con su
-- lugar y si le toca, una sola vez por viaje y por paso. El push lo manda el servidor (lib/avisar-gina.ts).

-- Qué pasos de cada viaje ya se avisaron (nadie la lee: la usa solo avisar_gina)
create table public.avisos_gina (
  viaje_id  uuid not null references public.viajes (id) on delete cascade,
  estado    public.estado_viaje not null,
  creado_en timestamptz not null default now(),
  primary key (viaje_id, estado)
);
alter table public.avisos_gina enable row level security;
revoke all on public.avisos_gina from anon, authenticated;

create function public.avisar_gina(p_viaje uuid)
returns table (persona_id uuid, endpoint text, p256dh text, auth text, estado text, lugar int, rol text, en_gina boolean, donde text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v public.viajes;
begin
  perform public._exigir_chofer();
  select * into v from public.viajes where id = p_viaje and chofer_id = auth.uid();
  if not found or v.sentido <> 'centro_a_vg' or v.estado not in ('llegando', 'en_parada') then return; end if;
  -- Una sola vez por viaje y por paso: si ya estaba, no avisa de nuevo
  insert into public.avisos_gina (viaje_id, estado) values (v.id, v.estado) on conflict do nothing;
  if not found then return; end if;
  -- Push, no la pestaña Notificaciones. El mismo plan que ve el chofer (plan_de_gina): sin los que ya llama otro carro
  -- en Gina, y R91 incluido (el chofer de prueba solo planea con cuentas de prueba). El lugar es el de toda la lista
  return query
  with orden as (
    select ol.id, (row_number() over (order by ol.creada_en, ol.id))::int as lugar
      from public.lista_gina ol where ol.estado = 'esperando' and ol.vence_en > now()
  )
  select l.pasajero_id, s.endpoint, s.p256dh, s.auth, v.estado::text, o.lugar, pl.rol, l.en_gina, l.lugar
    from public._plan_gina(v.id, public._ocupado_por_otros(v.id)) pl
    join public.lista_gina l on l.id = pl.entrada_id
    join orden o on o.id = l.id
    join public.push_suscripciones s on s.persona_id = l.pasajero_id
   where l.pasajero_id <> auth.uid();
end;
$$;
revoke execute on function public.avisar_gina(uuid) from anon, public;
grant execute on function public.avisar_gina(uuid) to authenticated;
