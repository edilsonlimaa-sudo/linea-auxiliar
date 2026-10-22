-- R73: ¿qué haces después de este viaje? Al salir sin otro viaje publicado, el chofer avisa si publica la vuelta, hace
-- una pausa (con hora) o es su último viaje de hoy. Lo ven los pasajeros (viajes los leen todos con sesión).

alter table public.viajes
  add column despues text check (despues in ('vuelta', 'pausa', 'ultimo')),
  add column despues_vuelve_en timestamptz; -- solo con pausa

-- Pausa o último: la vuelta no se avisa, se publica (y eso la marca sola, abajo)
create function public.decir_despues(p_viaje uuid, p_despues text, p_vuelve_en timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.viajes;
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);
  if v.estado <> 'en_ruta' then raise exception 'Solo con el viaje en ruta'; end if;
  if p_despues not in ('pausa', 'ultimo') then raise exception 'Escoge qué haces después'; end if;
  if p_despues = 'pausa' and (p_vuelve_en is null or p_vuelve_en <= now() or p_vuelve_en > now() + interval '12 hours') then
    raise exception 'Escoge una hora de vuelta dentro de las próximas 12 horas';
  end if;
  update public.viajes
     set despues = p_despues, despues_vuelve_en = case when p_despues = 'pausa' then p_vuelve_en end
   where id = v.id;
end;
$$;

-- Publicar un viaje mientras va en ruta: el que va en ruta pasa a "vuelta" (si había dicho pausa o último, cambió de idea)
create function public._despues_al_publicar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.viajes set despues = 'vuelta', despues_vuelve_en = null
   where chofer_id = new.chofer_id and estado = 'en_ruta' and id <> new.id;
  return new;
end;
$$;
create trigger despues_al_publicar after insert on public.viajes
  for each row execute function public._despues_al_publicar();

-- Terminar con pausa o último, sin otro viaje abierto: queda desconectado con la pausa de R60
create function public._despues_al_terminar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.viajes where chofer_id = new.chofer_id and id <> new.id
               and estado not in ('finalizado', 'cancelado')) then
    return new;
  end if;
  update public.perfiles set conectado_en = null where id = new.chofer_id;
  update public.pausas set cerrada_en = now() where chofer_id = new.chofer_id and cerrada_en is null;
  insert into public.pausas (chofer_id, vuelve_en)
  values (new.chofer_id, case when new.despues = 'pausa' then new.despues_vuelve_en end);
  return new;
end;
$$;
create trigger despues_al_terminar after update of estado on public.viajes
  for each row when (old.estado = 'en_ruta' and new.estado = 'finalizado' and new.despues in ('pausa', 'ultimo'))
  execute function public._despues_al_terminar();

revoke execute on function public._despues_al_publicar() from anon, public, authenticated;
revoke execute on function public._despues_al_terminar() from anon, public, authenticated;
revoke execute on function public.decir_despues(uuid, text, timestamptz) from anon, public;
grant execute on function public.decir_despues(uuid, text, timestamptz) to authenticated;
