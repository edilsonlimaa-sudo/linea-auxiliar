-- R60: "¿Vuelves a trabajar hoy?" Al desconectarse, el chofer dice si vuelve y a qué hora (o que terminó por hoy).
-- Se guarda como una pausa: los pasajeros la ven mientras sirve y queda el registro de cuándo volvió de verdad.

create table public.pausas (
  id          uuid primary key default gen_random_uuid(),
  chofer_id   uuid not null references public.perfiles (id) on delete cascade,
  inicio      timestamptz not null default now(),
  vuelve_en   timestamptz,  -- null = terminó por hoy
  cerrada_en  timestamptz,  -- se conectó de nuevo (o hizo otra pausa)
  check (vuelve_en is null or vuelve_en > inicio)
);
create index pausas_abiertas on public.pausas (chofer_id) where cerrada_en is null;

-- Solo el propio chofer y el admin leen la tabla; los pasajeros ven lo vigente con choferes_en_pausa()
alter table public.pausas enable row level security;
create policy "pausas: propias o admin" on public.pausas
  for select to authenticated using (chofer_id = auth.uid() or public.es_admin());

-- Desconectarse ahora pide la vuelta (R60). Sin argumento = terminó por hoy.
drop function public.desconectar();
create function public.desconectar(p_vuelve_en timestamptz default null)
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
    update public.reservas set estado = 'sin_puesto', cerrada_en = now()
     where viaje_id = v_id and estado = 'activa';
    update public.viajes set estado = 'cancelado', estado_en = now() where id = v_id;
  end loop;
  update public.perfiles set conectado_en = null where id = auth.uid();
  -- Una sola pausa abierta por chofer
  update public.pausas set cerrada_en = now() where chofer_id = auth.uid() and cerrada_en is null;
  insert into public.pausas (chofer_id, vuelve_en) values (auth.uid(), p_vuelve_en);
end;
$$;
revoke execute on function public.desconectar(timestamptz) from anon, public;
grant execute on function public.desconectar(timestamptz) to authenticated;

-- Al conectarse (o publicar, que conecta) la pausa se cierra sola: así queda cuándo volvió de verdad
create function public._cerrar_pausa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.pausas set cerrada_en = now() where chofer_id = new.id and cerrada_en is null;
  return new;
end;
$$;
revoke execute on function public._cerrar_pausa() from anon, public, authenticated;
create trigger cerrar_pausa_al_conectarse
  after update of conectado_en on public.perfiles
  for each row when (old.conectado_en is null and new.conectado_en is not null)
  execute function public._cerrar_pausa();

-- Lo que ve el pasajero (R60): quién vuelve y a qué hora, y quién terminó por hoy. La vuelta deja de mostrarse
-- 30 min después de la hora dicha; "terminó por hoy", a medianoche (America/Caracas).
create function public.choferes_en_pausa()
returns table (chofer_id uuid, nombre text, foto_path text, vuelve_en timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  return query
    select pa.chofer_id, p.nombre, p.foto_path, pa.vuelve_en
      from public.pausas pa
      join public.perfiles p on p.id = pa.chofer_id
     where pa.cerrada_en is null
       and p.rol = 'chofer' and p.estado = 'aprobado' and p.conectado_en is null
       and (
         (pa.vuelve_en is not null and pa.vuelve_en > now() - interval '30 minutes')
         or (pa.vuelve_en is null
             and (pa.inicio at time zone 'America/Caracas')::date = (now() at time zone 'America/Caracas')::date)
       )
     order by pa.vuelve_en nulls last, p.nombre;
end;
$$;
revoke execute on function public.choferes_en_pausa() from anon, public;
grant execute on function public.choferes_en_pausa() to authenticated;
