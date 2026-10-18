-- =====================================================================================
-- Reglas de negocio como funciones RPC (docs/especificacion.md). Todas son security definer:
-- validan quién llama (auth.uid()) y hacen el cambio completo en una sola transacción.
-- Las que tocan cupos bloquean la fila del viaje (for update) para que dos reservas
-- simultáneas no superen los puestos. Los mensajes de error se muestran tal cual al usuario.
-- =====================================================================================

-- ---------- Ayudantes internos (prefijo _; no se exponen a la API) ----------

create function public._exigir_aprobado()
returns public.perfiles language plpgsql stable security definer set search_path = '' as $$
declare p public.perfiles;
begin
  select * into p from public.perfiles where id = auth.uid();
  if p.id is null then raise exception 'Necesitas iniciar sesión'; end if;
  if p.estado = 'pendiente' then raise exception 'Tu cuenta está en revisión. El administrador debe aprobarla primero'; end if;
  if p.estado = 'rechazado' then raise exception 'Tu cuenta no fue aprobada. Comunícate con la administración'; end if;
  return p;
end;
$$;

create function public._exigir_chofer()
returns public.perfiles language plpgsql stable security definer set search_path = '' as $$
declare p public.perfiles := public._exigir_aprobado();
begin
  if p.rol <> 'chofer' then raise exception 'Solo los choferes pueden hacer esto'; end if;
  return p;
end;
$$;

create function public._exigir_pasajero()
returns public.perfiles language plpgsql stable security definer set search_path = '' as $$
declare p public.perfiles := public._exigir_aprobado();
begin
  if p.rol <> 'pasajero' then raise exception 'Solo los pasajeros pueden apartar puesto'; end if;
  return p;
end;
$$;

-- Viaje del chofer que llama, bloqueado para modificarlo
create function public._mi_viaje(p_viaje uuid)
returns public.viajes language plpgsql security definer set search_path = '' as $$
declare v public.viajes;
begin
  select * into v from public.viajes where id = p_viaje for update;
  if v.id is null then raise exception 'Ese viaje no existe'; end if;
  if v.chofer_id <> auth.uid() then raise exception 'Ese viaje no es tuyo'; end if;
  return v;
end;
$$;

-- Reserva por id (el viaje se valida y bloquea aparte con _mi_viaje)
create function public._reserva(p_reserva uuid)
returns public.reservas language plpgsql stable security definer set search_path = '' as $$
declare r public.reservas;
begin
  select * into r from public.reservas where id = p_reserva;
  if r.id is null then raise exception 'Esa reserva no existe'; end if;
  return r;
end;
$$;

-- Posición de una reserva en la lista (1 = primero). Orden: hora del servidor (R17).
create function public.posicion_reserva(p_reserva uuid)
returns int language sql stable security definer set search_path = '' as $$
  select pos::int from (
    select r.id, row_number() over (order by r.creado_en, r.id) as pos
      from public.reservas r
     where r.viaje_id = (select viaje_id from public.reservas where id = p_reserva)
       and r.estado in ('activa', 'subio')
  ) t where t.id = p_reserva;
$$;

-- Valida el "dónde te recogemos": lugar escrito y/o GPS, al menos uno (R25–R26). No hay paradas registradas:
-- si el lugar le queda o no de camino lo decide el chofer (R28–R29).
create function public._validar_lugar(p_lugar text, p_lat double precision, p_lng double precision)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if nullif(trim(coalesce(p_lugar, '')), '') is null and p_lat is null then
    raise exception 'Escribe dónde estás o comparte tu GPS';
  end if;
  if char_length(trim(coalesce(p_lugar, ''))) > 60 then
    raise exception 'El lugar es muy largo (máximo 60 letras)';
  end if;
  if (p_lat is null) <> (p_lng is null) then
    raise exception 'Ubicación GPS incompleta';
  end if;
end;
$$;

-- ¿El viaje acepta una reserva nueva? Abierto, o en ruta con puestos libres (pedido en el camino).
create function public._acepta_reservas(v public.viajes)
returns boolean language sql immutable set search_path = '' as $$
  select v.estado in ('programado', 'en_camino', 'llegando', 'en_parada')
      or (v.estado = 'en_ruta' and v.ocupados < v.puestos);
$$;

-- Cierra la reserva activa anterior de un pasajero (al cambiarse de carro, R18)
create function public._cerrar_reserva_activa(p_pasajero uuid)
returns void language sql security definer set search_path = '' as $$
  update public.reservas set estado = 'cancelada', cerrada_en = now()
   where pasajero_id = p_pasajero and estado = 'activa';
$$;

-- Cierra la espera activa de un pasajero
create function public._cerrar_espera(p_pasajero uuid, p_estado public.estado_espera)
returns void language sql security definer set search_path = '' as $$
  update public.esperas set estado = p_estado, cerrada_en = now()
   where pasajero_id = p_pasajero and estado = 'esperando';
$$;

-- Si el chofer no tiene recogida en curso, el próximo viaje programado arranca solo (R12)
create function public._promover(p_chofer uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_sig public.viajes;
begin
  if exists (select 1 from public.viajes where chofer_id = p_chofer
               and estado in ('en_camino', 'llegando', 'en_parada')) then
    return;
  end if;
  select * into v_sig from public.viajes
   where chofer_id = p_chofer and estado = 'programado'
   order by creado_en limit 1;
  if v_sig.id is null then return; end if;
  update public.viajes
     set estado = 'en_camino', estado_en = now(),
         -- con hora fija posterior, se respeta como mínimo
         eta_min = least(1440, greatest(eta_min, coalesce(ceil(extract(epoch from hora_fija - now()) / 60)::int, 0)))
   where id = v_sig.id;
end;
$$;

-- Al terminar un viaje: pedidos aceptados → subió; sin responder → rechazados (R30)
create function public._cerrar_pedidos(p_viaje uuid)
returns void language sql security definer set search_path = '' as $$
  update public.reservas
     set estado = case when pendiente then 'rechazada'::public.estado_reserva else 'subio'::public.estado_reserva end,
         cerrada_en = case when pendiente then now() else cerrada_en end
   where viaje_id = p_viaje and estado = 'activa';
$$;

-- =====================================================================================
-- Chofer: conexión (R6–R9)
-- =====================================================================================

create function public.conectar()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_chofer();
  update public.perfiles set conectado_en = now() where id = auth.uid();
end;
$$;

create function public.desconectar()
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._exigir_chofer();
  if exists (select 1 from public.viajes where chofer_id = auth.uid() and estado = 'en_ruta') then
    raise exception 'Termina tu viaje en ruta antes de desconectarte';
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
end;
$$;

-- =====================================================================================
-- Chofer: publicar y llevar el viaje (R10–R15, R24)
-- =====================================================================================

-- p_eta_min: minutos hasta llegar a recoger; si ya hay recogida en curso, es el trayecto del viaje encadenado.
-- p_hora_fija: "llego a las 14:00" (alternativa a los minutos).
create function public.publicar_viaje(
  p_sentido public.sentido,
  p_puestos int,
  p_eta_min int default null,
  p_hora_fija timestamptz default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_cadena boolean;
  v_anterior uuid;
  v_eta int;
  v_estado public.estado_viaje;
  v_id uuid;
begin
  perform public._exigir_chofer();
  if p_puestos is null or p_puestos not between 1 and 8 then
    raise exception 'Los puestos deben estar entre 1 y 8';
  end if;
  if p_eta_min is not null and p_eta_min not between 0 and 240 then
    raise exception 'El tiempo debe estar entre 0 y 240 minutos';
  end if;

  -- Hay recogida en curso → este viaje se encadena detrás del último abierto (R11)
  v_cadena := exists (select 1 from public.viajes where chofer_id = auth.uid()
                        and estado in ('en_camino', 'llegando', 'en_parada'));
  if v_cadena then
    select id into v_anterior from public.viajes
     where chofer_id = auth.uid() and estado in ('programado', 'en_camino', 'llegando', 'en_parada')
     order by creado_en desc limit 1;
    v_estado := 'programado';
    v_eta := coalesce(p_eta_min, 20);
  else
    v_eta := coalesce(
      case when p_hora_fija is not null
           then least(1440, greatest(0, ceil(extract(epoch from p_hora_fija - now()) / 60)))::int end,
      p_eta_min, 10);
    v_estado := case when v_eta = 0 then 'en_parada' else 'en_camino' end;
  end if;

  insert into public.viajes (chofer_id, sentido, puestos, eta_min, hora_fija, estado, despues_de)
  values (auth.uid(), p_sentido, p_puestos, v_eta, case when v_cadena then p_hora_fija end, v_estado, v_anterior)
  returning id into v_id;

  -- Publicar conecta solo (R6)
  update public.perfiles set conectado_en = coalesce(conectado_en, now()) where id = auth.uid();
  return v_id;
end;
$$;

-- Avanza el estado del viaje: en_camino → llegando → en_parada → en_ruta → finalizado
create function public.avanzar_viaje(p_viaje uuid, p_estado public.estado_viaje)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.viajes;
  r record;
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);

  if not (
       (v.estado = 'en_camino' and p_estado in ('llegando', 'en_parada'))
    or (v.estado = 'llegando'  and p_estado = 'en_parada')
    or (v.estado = 'en_parada' and p_estado = 'en_ruta')
    or (v.estado = 'en_ruta'   and p_estado = 'finalizado')
  ) then
    raise exception 'No se puede pasar de % a %', v.estado, p_estado;
  end if;

  if p_estado = 'en_parada' then
    -- Llegó a la recogida: el viaje anterior que iba en ruta se cierra solo (R13)
    for r in select id from public.viajes
              where chofer_id = auth.uid() and estado = 'en_ruta' and id <> v.id
    loop
      perform public._cerrar_pedidos(r.id);
      update public.viajes set estado = 'finalizado', estado_en = now(), llegada_en = now() where id = r.id;
    end loop;
  end if;

  if p_estado = 'en_ruta' then
    -- Los confirmados suben; la lista de espera queda sin puesto, sin asignarla a otro carro (R14)
    update public.reservas res
       set estado = case when t.pos <= v.puestos then 'subio'::public.estado_reserva
                         else 'sin_puesto'::public.estado_reserva end,
           cerrada_en = case when t.pos <= v.puestos then null else now() end
      from (select id, row_number() over (order by creado_en, id) as pos
              from public.reservas where viaje_id = v.id and estado = 'activa') t
     where res.id = t.id;
    update public.viajes set salida_en = now() where id = v.id;
  end if;

  if p_estado = 'finalizado' then
    perform public._cerrar_pedidos(v.id);
    update public.viajes set llegada_en = now() where id = v.id;
  end if;

  update public.viajes set estado = p_estado, estado_en = now() where id = v.id;

  if p_estado in ('en_ruta', 'finalizado') then
    perform public._promover(auth.uid());
  end if;
end;
$$;

create function public.cancelar_viaje(p_viaje uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.viajes;
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);
  if v.estado = 'en_ruta' then raise exception 'El viaje ya salió: termínalo en lugar de cancelarlo'; end if;
  if v.estado in ('finalizado', 'cancelado') then raise exception 'Ese viaje ya está cerrado'; end if;
  -- Los anotados deben escoger otra unidad (R24)
  update public.reservas set estado = 'sin_puesto', cerrada_en = now()
   where viaje_id = v.id and estado = 'activa';
  update public.viajes set estado = 'cancelado', estado_en = now() where id = v.id;
  perform public._promover(auth.uid());
end;
$$;

create function public.cambiar_puestos(p_viaje uuid, p_puestos int)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.viajes;
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);
  if v.estado in ('finalizado', 'cancelado') then raise exception 'Ese viaje ya está cerrado'; end if;
  if p_puestos is null or p_puestos not between 1 and 8 then raise exception 'Los puestos deben estar entre 1 y 8'; end if;
  if v.estado = 'en_ruta' and p_puestos < v.ocupados then
    raise exception 'Llevas % pasajeros: no puedes bajar a % puestos', v.ocupados, p_puestos;
  end if;
  update public.viajes set puestos = p_puestos where id = v.id;
end;
$$;

-- =====================================================================================
-- Pasajero: reservar (R16–R29)
-- =====================================================================================

create function public.reservar(
  p_viaje uuid,
  p_lugar text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.viajes;
  v_en_ruta boolean;
  v_id uuid;
begin
  perform public._exigir_pasajero();
  select * into v from public.viajes where id = p_viaje for update;
  if v.id is null then raise exception 'Ese viaje no existe'; end if;
  if not public._acepta_reservas(v) then
    raise exception '%', case when v.estado = 'en_ruta' then 'Ese carro ya va lleno' else 'Este viaje ya no acepta reservas' end;
  end if;
  perform public._validar_lugar(p_lugar, p_lat, p_lng);

  v_en_ruta := v.estado = 'en_ruta';
  perform public._cerrar_reserva_activa(auth.uid());   -- un solo lugar activo (R18)
  perform public._cerrar_espera(auth.uid(), 'reservo');

  insert into public.reservas (viaje_id, pasajero_id, lugar, lat, lng, en_camino, pendiente)
  values (v.id, auth.uid(), nullif(trim(coalesce(p_lugar, '')), ''), p_lat, p_lng,
          v_en_ruta, v_en_ruta)  -- en ruta: pedido en el camino, el chofer decide (R29)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.cambiar_lugar(
  p_reserva uuid,
  p_lugar text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._validar_lugar(p_lugar, p_lat, p_lng);
  update public.reservas
     set lugar = nullif(trim(coalesce(p_lugar, '')), ''), lat = p_lat, lng = p_lng
   where id = p_reserva and pasajero_id = auth.uid() and estado = 'activa';
  if not found then raise exception 'No tienes esa reserva activa'; end if;
end;
$$;

-- Los 3 lugares escritos más recientes del pasajero (reservas y esperas), para escoger con un toque (R25)
create function public.mis_lugares_recientes()
returns table (lugar text) language sql stable security definer set search_path = '' as $$
  select t.lugar from (
    select r.lugar, r.creado_en from public.reservas r where r.pasajero_id = auth.uid() and r.lugar is not null
    union all
    select e.lugar, e.creado_en from public.esperas e where e.pasajero_id = auth.uid() and e.lugar is not null
  ) t
  group by t.lugar
  order by max(t.creado_en) desc
  limit 3;
$$;

-- "Ya no voy": libera el lugar y el siguiente sube solo (R20)
create function public.cancelar_reserva(p_reserva uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.reservas set estado = 'cancelada', cerrada_en = now()
   where id = p_reserva and pasajero_id = auth.uid() and estado = 'activa';
  if not found then raise exception 'No tienes esa reserva activa'; end if;
end;
$$;

-- "✋ Ya estoy en el sitio" (R23)
create function public.marcar_listo(p_reserva uuid, p_listo boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.reservas set listo = p_listo
   where id = p_reserva and pasajero_id = auth.uid() and estado = 'activa';
  if not found then raise exception 'No tienes esa reserva activa'; end if;
end;
$$;

create function public.omitir_calificacion(p_reserva uuid)
returns void language sql security definer set search_path = '' as $$
  update public.reservas set calificacion_omitida = true where id = p_reserva and pasajero_id = auth.uid();
$$;

-- Lista pública de un viaje: posición, nombre corto y estado. Sin teléfono ni ubicación (R19).
create function public.lista_viaje(p_viaje uuid)
returns table (
  posicion int,
  nombre_corto text,
  confirmado boolean,
  listo boolean,
  en_camino boolean,
  pendiente boolean,
  es_mio boolean
)
language sql stable security definer set search_path = '' as $$
  select t.pos::int,
         coalesce(public.nombre_corto(p.nombre), t.nombre),
         t.pos <= v.puestos,
         t.listo, t.en_camino, t.pendiente,
         t.pasajero_id is not distinct from auth.uid() and t.pasajero_id is not null
    from (select r.*, row_number() over (order by r.creado_en, r.id) as pos
            from public.reservas r
           where r.viaje_id = p_viaje and r.estado in ('activa', 'subio')) t
    join public.viajes v on v.id = t.viaje_id
    left join public.perfiles p on p.id = t.pasajero_id
   where auth.uid() is not null
   order by t.pos;
$$;

-- =====================================================================================
-- Chofer: manejar la lista de su carro (R21, R29, R36–R38)
-- =====================================================================================

-- "No vino": antes de salir, solo confirmados; en ruta, solo pedidos aceptados (R21, R29)
create function public.marcar_no_vino(p_reserva uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reservas; v public.viajes;
begin
  perform public._exigir_chofer();
  r := public._reserva(p_reserva);
  v := public._mi_viaje(r.viaje_id);
  if r.estado <> 'activa' then raise exception 'Esa reserva ya está cerrada'; end if;
  if v.estado = 'en_ruta' then
    if r.pendiente then raise exception 'Primero responde el pedido'; end if;
  elsif v.estado in ('en_camino', 'llegando', 'en_parada') then
    if public.posicion_reserva(r.id) > v.puestos then raise exception 'Esa persona está en lista de espera, no tiene puesto'; end if;
  else
    raise exception 'Todavía no puedes marcar "No vino" en este viaje';
  end if;
  update public.reservas set estado = 'no_llego', cerrada_en = now() where id = r.id;
end;
$$;

-- Pedido en el camino: "Voy" o "Sigo" (R29)
create function public.responder_pedido(p_reserva uuid, p_acepta boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reservas; v public.viajes;
begin
  perform public._exigir_chofer();
  r := public._reserva(p_reserva);
  v := public._mi_viaje(r.viaje_id);
  if v.estado <> 'en_ruta' or r.estado <> 'activa' or not r.pendiente then
    raise exception 'Ese pedido ya no está pendiente';
  end if;
  if p_acepta then
    update public.reservas set pendiente = false, aceptada_en = now() where id = r.id;
  else
    update public.reservas set estado = 'rechazada', pendiente = false, cerrada_en = now() where id = r.id;
  end if;
end;
$$;

-- El pasajero del pedido aceptado subió
create function public.marcar_subio(p_reserva uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reservas; v public.viajes;
begin
  perform public._exigir_chofer();
  r := public._reserva(p_reserva);
  v := public._mi_viaje(r.viaje_id);
  if v.estado <> 'en_ruta' or r.estado <> 'activa' or r.pendiente then
    raise exception 'Solo puedes marcar "Subió" en un pedido aceptado con el viaje en ruta';
  end if;
  update public.reservas set estado = 'subio' where id = r.id;
end;
$$;

-- Se bajó antes del destino: libera el puesto (R38)
create function public.marcar_se_bajo(p_reserva uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reservas; v public.viajes;
begin
  perform public._exigir_chofer();
  r := public._reserva(p_reserva);
  v := public._mi_viaje(r.viaje_id);
  if v.estado <> 'en_ruta' or r.estado <> 'subio' then raise exception 'Esa persona no va a bordo'; end if;
  update public.reservas set estado = 'bajo', cerrada_en = now() where id = r.id;
end;
$$;

-- "➕ Ocupar puesto" para quien no usa la app (R36–R37).
-- Antes de salir: siguiente puesto libre o, si va lleno, al final de la lista de espera.
-- En ruta: solo si hay puesto libre ("Subió en el camino").
create function public.ocupar_puesto(p_viaje uuid, p_nombre text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.viajes; v_id uuid;
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);
  if v.estado = 'en_ruta' then
    if v.ocupados >= v.puestos then raise exception 'Vas lleno. Si alguien se bajó, márcalo primero o sube los puestos'; end if;
    insert into public.reservas (viaje_id, nombre, estado, listo, en_camino)
    values (v.id, coalesce(nullif(trim(coalesce(p_nombre, '')), ''), 'Pasajero sin app'), 'subio', true, true)
    returning id into v_id;
  elsif v.estado in ('programado', 'en_camino', 'llegando', 'en_parada') then
    insert into public.reservas (viaje_id, nombre, listo)
    values (v.id, coalesce(nullif(trim(coalesce(p_nombre, '')), ''), 'Pasajero sin app'), true)
    returning id into v_id;
  else
    raise exception 'Ese viaje ya está cerrado';
  end if;
  return v_id;
end;
$$;

-- "Quitar" a un anotado a mano (R38)
create function public.quitar_anotado(p_reserva uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.reservas; v public.viajes;
begin
  perform public._exigir_chofer();
  r := public._reserva(p_reserva);
  v := public._mi_viaje(r.viaje_id);
  if r.pasajero_id is not null then raise exception 'Solo puedes quitar a quien anotaste a mano'; end if;
  update public.reservas set estado = 'cancelada', cerrada_en = now()
   where id = r.id and estado in ('activa', 'subio');
end;
$$;

-- =====================================================================================
-- Esperando (demanda) (R31–R35)
-- =====================================================================================

create function public.marcar_espera(
  p_sentido public.sentido,
  p_lugar text default null,
  p_lat double precision default null,
  p_lng double precision default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._exigir_pasajero();
  if p_sentido is null then raise exception 'Indica hacia dónde vas'; end if;
  perform public._validar_lugar(p_lugar, p_lat, p_lng);
  perform public._cerrar_espera(auth.uid(), 'cancelada');
  insert into public.esperas (pasajero_id, sentido, lugar, lat, lng)
  values (auth.uid(), p_sentido, nullif(trim(coalesce(p_lugar, '')), ''), p_lat, p_lng)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.cancelar_espera()
returns void language sql security definer set search_path = '' as $$
  select public._cerrar_espera(auth.uid(), 'cancelada');
$$;

-- Demanda por sentido para los choferes (R31): solo cuántos esperan, nunca quién ni dónde (§6).
-- Las esperas vencidas (R35) no cuentan aunque la tarea programada todavía no las haya cerrado.
create function public.demanda_por_sentido()
returns table (sentido public.sentido, esperando int)
language sql stable security definer set search_path = '' as $$
  select s.sentido, count(e.id)::int
    from unnest(enum_range(null::public.sentido)) as s(sentido)
    left join public.esperas e
      on e.sentido = s.sentido and e.estado = 'esperando' and e.creado_en > now() - interval '2 hours'
   where auth.uid() is not null
   group by s.sentido;
$$;

-- =====================================================================================
-- Auxilio vial (R43)
-- =====================================================================================

create function public.crear_alerta(p_tipo public.tipo_alerta, p_lat double precision default null, p_lng double precision default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._exigir_chofer();
  if exists (select 1 from public.alertas where chofer_id = auth.uid() and estado = 'activa') then
    raise exception 'Ya tienes una alerta activa';
  end if;
  insert into public.alertas (chofer_id, tipo, lat, lng) values (auth.uid(), p_tipo, p_lat, p_lng)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.apoyar_alerta(p_alerta uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_chofer();
  if not exists (select 1 from public.alertas where id = p_alerta and estado = 'activa' and chofer_id <> auth.uid()) then
    raise exception 'Esa alerta ya no está activa';
  end if;
  insert into public.alerta_apoyos (alerta_id, chofer_id) values (p_alerta, auth.uid()) on conflict do nothing;
end;
$$;

create function public.resolver_alerta(p_alerta uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.alertas set estado = 'resuelta', resuelta_en = now()
   where id = p_alerta and chofer_id = auth.uid() and estado = 'activa';
  if not found then raise exception 'No tienes esa alerta activa'; end if;
end;
$$;

-- =====================================================================================
-- Cuentas y admin (R2, R4, R5)
-- =====================================================================================

create function public.aprobar_cuenta(p_usuario uuid, p_aprobar boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede aprobar cuentas'; end if;
  update public.perfiles
     set estado = case when p_aprobar then 'aprobado'::public.estado_cuenta else 'rechazado'::public.estado_cuenta end,
         aprobado_por = auth.uid(), aprobado_en = now()
   where id = p_usuario and rol <> 'admin';
  if not found then raise exception 'Esa cuenta no existe'; end if;
end;
$$;

-- Teléfono y cédula propios
create function public.mis_datos_privados()
returns table (telefono text, cedula text)
language sql stable security definer set search_path = '' as $$
  select telefono, cedula from public.perfiles_privados where id = auth.uid();
$$;

-- Teléfono y cédula de cualquier cuenta (solo admin, para verificar identidad)
create function public.admin_datos_privados(p_usuario uuid)
returns table (telefono text, cedula text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador puede ver estos datos'; end if;
  return query select pp.telefono, pp.cedula from public.perfiles_privados pp where pp.id = p_usuario;
end;
$$;

-- ---------- Tareas automáticas (las agenda la migración siguiente con pg_cron) ----------

-- Medianoche (America/Caracas): se desconectan los choferes sin viajes activos (R9)
create function public.desconectar_inactivos()
returns void language sql security definer set search_path = '' as $$
  update public.perfiles p set conectado_en = null
   where p.rol = 'chofer' and p.conectado_en is not null
     and not exists (select 1 from public.viajes v where v.chofer_id = p.id
                      and v.estado not in ('finalizado', 'cancelado'));
$$;

-- Una espera vence sola a las 2 h (R35)
create function public.vencer_esperas()
returns void language sql security definer set search_path = '' as $$
  update public.esperas set estado = 'expirada', cerrada_en = now()
   where estado = 'esperando' and creado_en < now() - interval '2 hours';
$$;

-- ---------- Permisos de ejecución ----------
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
-- Internas y de tareas automáticas: no se llaman desde la app
revoke execute on function
  public._exigir_aprobado(), public._exigir_chofer(), public._exigir_pasajero(),
  public._mi_viaje(uuid), public._reserva(uuid),
  public._validar_lugar(text, double precision, double precision),
  public._acepta_reservas(public.viajes), public._cerrar_reserva_activa(uuid),
  public._cerrar_espera(uuid, public.estado_espera), public._promover(uuid), public._cerrar_pedidos(uuid),
  public.desconectar_inactivos(), public.vencer_esperas(),
  public.actualizar_ocupados(), public.normalizar_placa(), public.hora_servidor_posicion(), public.crear_perfil_nuevo()
from authenticated;
