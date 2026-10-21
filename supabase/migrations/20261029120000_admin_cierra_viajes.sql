-- R69: el admin cierra viajes y desconecta choferes (viajes muertos, choferes que avisan que no pueden seguir).
-- Al cerrar un viaje, nadie de la lista hacia Valle Grande pierde su lugar: vuelve a la lista donde estaba.

-- Quien estaba en la lista y quedó con este carro vuelve a su lugar (mismo creada_en), con 45 min por delante.
-- p_con_subio: también los que subieron en Gina (el viaje no llegó a salir). Si ya se anotó otra vez, no se toca.
create function public._devolver_a_lista(p_viaje uuid, p_con_subio boolean)
returns void language sql security definer set search_path = '' as $$
  update public.lista_gina l
     set estado = 'esperando', viaje_id = null, reserva_id = null, cerrada_en = null, dice_que_subio = null,
         vence_en = now() + interval '45 minutes'
    from public.reservas r
   where l.viaje_id = p_viaje and r.id = l.reserva_id
     and ((l.estado = 'en_carro' and r.estado = 'activa') or (p_con_subio and l.estado = 'subio' and r.estado = 'subio'))
     and not exists (select 1 from public.lista_gina o where o.pasajero_id = l.pasajero_id and o.estado = 'esperando');
$$;

-- Cerrar un viaje abierto: sin salir, se cancela (R24); en ruta, se termina sin inventar que subió quien faltaba
create function public._cerrar_viaje(p_viaje uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.viajes;
begin
  select * into v from public.viajes where id = p_viaje for update;
  if v.id is null or v.estado in ('finalizado', 'cancelado') then raise exception 'Ese viaje ya está cerrado'; end if;

  if v.estado = 'en_ruta' then
    perform public._devolver_a_lista(v.id, false);
    update public.reservas set estado = 'rechazada', pendiente = false, cerrada_en = now()
     where viaje_id = v.id and estado = 'activa' and pendiente;
    update public.reservas set estado = 'sin_puesto', cerrada_en = now()
     where viaje_id = v.id and estado = 'activa';
    update public.viajes set estado = 'finalizado', estado_en = now(), llegada_en = now() where id = v.id;
  else
    perform public._devolver_a_lista(v.id, true);
    -- Los anotados deben escoger otra unidad (R24); quien subió en Gina vuelve a la lista (arriba)
    update public.reservas set estado = 'sin_puesto', cerrada_en = now()
     where viaje_id = v.id and (estado = 'activa' or (estado = 'subio' and v.sentido = 'centro_a_vg'));
    update public.viajes set estado = 'cancelado', estado_en = now() where id = v.id;
  end if;
end;
$$;

-- ---------- Admin (R69) ----------

create function public.admin_cerrar_viaje(p_viaje uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_chofer uuid;
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede cerrar viajes'; end if;
  select chofer_id into v_chofer from public.viajes where id = p_viaje;
  perform public._cerrar_viaje(p_viaje);
  perform public._promover(v_chofer);
end;
$$;

create function public.admin_desconectar(p_chofer uuid)
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
  end loop;
  update public.perfiles set conectado_en = null where id = p_chofer;
  -- "Terminó por hoy" (R60): así los pasajeros no lo esperan
  update public.pausas set cerrada_en = now() where chofer_id = p_chofer and cerrada_en is null;
  insert into public.pausas (chofer_id, vuelve_en) values (p_chofer, null);
end;
$$;

-- ---------- El chofer: igual que antes, y la gente de la lista vuelve a su lugar ----------

create or replace function public.cancelar_viaje(p_viaje uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.viajes;
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);
  if v.estado = 'en_ruta' then raise exception 'El viaje ya salió: termínalo en lugar de cancelarlo'; end if;
  perform public._cerrar_viaje(v.id);
  perform public._promover(auth.uid());
end;
$$;

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
  end loop;
  update public.perfiles set conectado_en = null where id = auth.uid();
  -- Una sola pausa abierta por chofer
  update public.pausas set cerrada_en = now() where chofer_id = auth.uid() and cerrada_en is null;
  insert into public.pausas (chofer_id, vuelve_en) values (auth.uid(), p_vuelve_en);
end;
$$;

revoke execute on function public._devolver_a_lista(uuid, boolean) from anon, public, authenticated;
revoke execute on function public._cerrar_viaje(uuid) from anon, public, authenticated;
revoke execute on function public.admin_cerrar_viaje(uuid) from anon, public;
revoke execute on function public.admin_desconectar(uuid) from anon, public;
grant execute on function public.admin_cerrar_viaje(uuid) to authenticated;
grant execute on function public.admin_desconectar(uuid) to authenticated;
