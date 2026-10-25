-- R60: "Sí, vuelvo" sin decir la hora. Prometer una hora y no cumplirla es peor que no decirla: la hora es opcional.
-- La pausa guarda que vuelve hoy aunque no diga cuándo (vuelve_en null y sin_hora = vuelve; antes null era solo
-- "terminó por hoy").

alter table public.pausas add column sin_hora boolean not null default false;
alter table public.pausas add constraint pausas_sin_hora check (not sin_hora or vuelve_en is null);

-- Desconectarse: p_vuelve = true sin hora → "vuelve más tarde"; con hora, vuelve a esa hora; ninguno → terminó por hoy
drop function public.desconectar(timestamptz);
create function public.desconectar(p_vuelve_en timestamptz default null, p_vuelve boolean default false)
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
  insert into public.pausas (chofer_id, vuelve_en, sin_hora)
  values (auth.uid(), p_vuelve_en, p_vuelve_en is null and coalesce(p_vuelve, false));
end;
$$;
revoke execute on function public.desconectar(timestamptz, boolean) from anon, public;
grant execute on function public.desconectar(timestamptz, boolean) to authenticated;

-- Lo que ve el pasajero: también quien vuelve sin hora ("vuelve más tarde"), hasta la medianoche como "terminó por hoy"
drop function public.choferes_en_pausa();
create function public.choferes_en_pausa()
returns table (chofer_id uuid, nombre text, foto_path text, vuelve_en timestamptz, sin_hora boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Necesitas iniciar sesión'; end if;
  return query
    select pa.chofer_id, p.nombre, p.foto_path, pa.vuelve_en, pa.sin_hora
      from public.pausas pa
      join public.perfiles p on p.id = pa.chofer_id
     where pa.cerrada_en is null
       and p.rol = 'chofer' and p.estado = 'aprobado' and p.conectado_en is null
       and (
         (pa.vuelve_en is not null and pa.vuelve_en > now() - interval '30 minutes')
         or (pa.vuelve_en is null
             and (pa.inicio at time zone 'America/Caracas')::date = (now() at time zone 'America/Caracas')::date)
       )
     order by pa.vuelve_en nulls last, pa.sin_hora desc, p.nombre;
end;
$$;
revoke execute on function public.choferes_en_pausa() from anon, public;
grant execute on function public.choferes_en_pausa() to authenticated;
