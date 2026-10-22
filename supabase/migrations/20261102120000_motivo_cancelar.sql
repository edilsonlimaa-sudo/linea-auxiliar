-- R72: por qué se cancela un viaje y quién lo cerró (el chofer al cancelar o al desconectarse, el admin al cerrar el
-- viaje o al desconectar al chofer). Tabla aparte: viajes la leen todos, esto solo el admin y el chofer del viaje.

create table public.viaje_cierres (
  viaje_id uuid primary key references public.viajes (id) on delete cascade,
  por text not null check (por in ('chofer', 'chofer_desconectar', 'admin', 'admin_desconectar')),
  motivo text check (motivo in ('cambiar_hora', 'me_equivoque', 'nadie', 'lleno_fuera', 'carro', 'no_sigo', 'otra')),
  detalle text check (char_length(detalle) <= 120),
  en timestamptz not null default now()
);

alter table public.viaje_cierres enable row level security;
create policy "viaje_cierres: admin o el chofer del viaje" on public.viaje_cierres
  for select to authenticated using (
    public.es_admin() or exists (select 1 from public.viajes v where v.id = viaje_id and v.chofer_id = auth.uid())
  );
grant select on public.viaje_cierres to authenticated;

create function public._registrar_cierre(p_viaje uuid, p_por text, p_motivo text default null, p_detalle text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.viaje_cierres (viaje_id, por, motivo, detalle)
  values (p_viaje, p_por, p_motivo, nullif(btrim(p_detalle), ''))
  on conflict (viaje_id) do update set por = excluded.por, motivo = excluded.motivo, detalle = excluded.detalle, en = now();
$$;

-- ---------- El chofer cancela, con su motivo (en la app es obligatorio; sin él, igual cancela: apps viejas) ----------

drop function public.cancelar_viaje(uuid);
create function public.cancelar_viaje(p_viaje uuid, p_motivo text default null, p_detalle text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.viajes;
begin
  perform public._exigir_chofer();
  if p_motivo is not null and p_motivo not in ('cambiar_hora', 'me_equivoque', 'nadie', 'lleno_fuera', 'carro', 'no_sigo', 'otra') then
    raise exception 'Motivo no válido';
  end if;
  if char_length(btrim(p_detalle)) > 120 then raise exception 'Escribe el motivo en menos de 120 letras'; end if;
  v := public._mi_viaje(p_viaje);
  if v.estado = 'en_ruta' then raise exception 'El viaje ya salió: termínalo en lugar de cancelarlo'; end if;
  perform public._cerrar_viaje(v.id);
  perform public._registrar_cierre(v.id, 'chofer', p_motivo, case when p_motivo = 'otra' then p_detalle end);
  perform public._promover(auth.uid());
end;
$$;

-- ---------- Los demás cierres: igual que antes, y queda quién ----------

create or replace function public.desconectar(p_vuelve_en timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._exigir_chofer();
  if exists (select 1 from public.viajes where chofer_id = auth.uid() and estado = 'en_ruta') then
    raise exception 'Termina tu viaje en ruta antes de desconectarte';
  end if;
  if p_vuelve_en is not null and (p_vuelve_en <= now() or p_vuelve_en > now() + interval '12 hours') then
    raise exception 'Escoge una hora de vuelta dentro de las próximas 12 horas';
  end if;
  -- Se cancelan los viajes publicados; los anotados deben escoger otra unidad (R8)
  for v_id in select id from public.viajes
               where chofer_id = auth.uid() and estado in ('programado', 'en_camino', 'llegando', 'en_parada')
  loop
    perform public._cerrar_viaje(v_id);
    perform public._registrar_cierre(v_id, 'chofer_desconectar');
  end loop;
  update public.perfiles set conectado_en = null where id = auth.uid();
  -- Una sola pausa abierta por chofer
  update public.pausas set cerrada_en = now() where chofer_id = auth.uid() and cerrada_en is null;
  insert into public.pausas (chofer_id, vuelve_en) values (auth.uid(), p_vuelve_en);
end;
$$;

create or replace function public.admin_cerrar_viaje(p_viaje uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_chofer uuid;
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede cerrar viajes'; end if;
  select chofer_id into v_chofer from public.viajes where id = p_viaje;
  perform public._cerrar_viaje(p_viaje);
  perform public._registrar_cierre(p_viaje, 'admin');
  perform public._promover(v_chofer);
end;
$$;

create or replace function public.admin_desconectar(p_chofer uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede desconectar choferes'; end if;
  if not exists (select 1 from public.perfiles where id = p_chofer and rol = 'chofer') then
    raise exception 'Ese chofer no existe';
  end if;
  for v_id in select id from public.viajes where chofer_id = p_chofer and estado not in ('finalizado', 'cancelado')
               order by creado_en
  loop
    perform public._cerrar_viaje(v_id);
    perform public._registrar_cierre(v_id, 'admin_desconectar');
  end loop;
  update public.perfiles set conectado_en = null where id = p_chofer;
  -- "Terminó por hoy" (R60): así los pasajeros no lo esperan
  update public.pausas set cerrada_en = now() where chofer_id = p_chofer and cerrada_en is null;
  insert into public.pausas (chofer_id, vuelve_en) values (p_chofer, null);
end;
$$;

revoke execute on function public._registrar_cierre(uuid, text, text, text) from anon, public, authenticated;
revoke execute on function public.cancelar_viaje(uuid, text, text) from anon, public;
grant execute on function public.cancelar_viaje(uuid, text, text) to authenticated;
