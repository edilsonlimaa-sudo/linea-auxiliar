-- Lista de Gina (docs/especificacion.md §5.17, R62–R68): en Centro → Valle Grande no se aparta puesto. El pasajero
-- avisa "Estoy en Gina" (o dónde espera en el camino) y entra en una lista única por orden de llegada. El carro en
-- Gina arma su plan con esa lista: llama a los de Gina y guarda puesto a los del camino. Cada "Subió" es una reserva
-- a bordo; al salir, los del camino quedan como reservas activas del carro ("va por ti"): así Se bajó, No vino,
-- historial y calificaciones siguen igual (R68).

create type public.estado_en_lista as enum ('esperando', 'en_carro', 'subio', 'se_fue', 'vencida', 'no_estaba');

create table public.lista_gina (
  id           uuid primary key default gen_random_uuid(),
  pasajero_id  uuid not null references public.perfiles (id) on delete cascade,
  en_gina      boolean not null,                       -- true: "Estoy en Gina"; false: en el camino
  lugar        text check (lugar is null or char_length(lugar) between 1 and 60), -- dónde espera, si no es Gina
  personas     int not null default 1 check (personas between 1 and 4),            -- suben juntos o no suben (R57)
  estado       public.estado_en_lista not null default 'esperando',
  viaje_id     uuid references public.viajes (id) on delete set null,   -- el carro que lo llevó o va por él (R66)
  reserva_id   uuid references public.reservas (id) on delete set null, -- su lugar a bordo (R68)
  creada_en    timestamptz not null default clock_timestamp(),
  vence_en     timestamptz not null default now() + interval '45 minutes',
  cerrada_en   timestamptz,
  constraint lista_gina_lugar check (en_gina or lugar is not null)
);
create unique index lista_gina_una_activa on public.lista_gina (pasajero_id) where estado = 'esperando';
create index lista_gina_orden on public.lista_gina (creada_en) where estado = 'esperando';

-- Lo que no ve todo el mundo: el GPS y qué tan lejos estaba al avisar (R62, §6)
create table public.lista_gina_privado (
  id           uuid primary key references public.lista_gina (id) on delete cascade,
  lat          double precision,
  lng          double precision,
  distancia_m  int check (distancia_m >= 0),
  constraint lista_gina_privado_coordenadas check ((lat is null) = (lng is null))
);

alter table public.lista_gina enable row level security;
alter table public.lista_gina_privado enable row level security;
-- La lista es pública para quien tiene sesión (R63): así le llega en vivo a todos
create policy "lista_gina: con sesión" on public.lista_gina for select to authenticated using (true);
create policy "lista_gina_privado: choferes y admin" on public.lista_gina_privado
  for select to authenticated using (public.es_admin() or public.es_chofer());
-- Se escriben solo con las funciones de abajo

alter publication supabase_realtime add table public.lista_gina;

-- ---------- Pasajero ----------

-- "Estoy en Gina" o "Estoy en …" (R62)
create function public.estoy_en_lista(
  p_en_gina boolean,
  p_lugar text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_personas int default 1,
  p_distancia_m int default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  p public.perfiles := public._exigir_aprobado();
  v_lugar text := nullif(btrim(coalesce(p_lugar, '')), '');
  v_id uuid;
begin
  if p.rol <> 'pasajero' then raise exception 'Solo los pasajeros se anotan en la lista'; end if;
  if p_personas is null or p_personas not between 1 and 4 then raise exception 'Pueden ir de 1 a 4 personas por aviso'; end if;
  if (p_lat is null) <> (p_lng is null) then raise exception 'Ubicación incompleta'; end if;
  if not coalesce(p_en_gina, false) then
    if v_lugar is null and p_lat is null then raise exception 'Escribe dónde estás esperando'; end if;
    if char_length(coalesce(v_lugar, '')) > 60 then raise exception 'El lugar puede tener hasta 60 letras'; end if;
    v_lugar := coalesce(v_lugar, 'Su ubicación (GPS)');
  else
    v_lugar := null;
  end if;
  if exists (select 1 from public.reservas r join public.viajes v on v.id = r.viaje_id
              where r.pasajero_id = p.id and r.estado in ('activa', 'subio') and v.estado not in ('finalizado', 'cancelado')) then
    raise exception 'Ya tienes un viaje en curso';
  end if;

  -- Si la suya ya venció, se cierra antes de anotarse otra vez
  update public.lista_gina set estado = 'vencida', cerrada_en = vence_en
   where pasajero_id = p.id and estado = 'esperando' and vence_en <= now();
  if exists (select 1 from public.lista_gina where pasajero_id = p.id and estado = 'esperando') then
    raise exception 'Ya estás en la lista';
  end if;

  insert into public.lista_gina (pasajero_id, en_gina, lugar, personas)
  values (p.id, p_en_gina, v_lugar, p_personas)
  returning id into v_id;
  insert into public.lista_gina_privado (id, lat, lng, distancia_m)
  values (v_id, p_lat, p_lng, case when p_distancia_m is not null then greatest(0, p_distancia_m) end);
  return v_id;
end;
$$;

-- "Sí, sigo aquí": 45 min más sin perder el lugar (R62)
create function public.sigo_en_lista()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.lista_gina set vence_en = now() + interval '45 minutes'
   where pasajero_id = auth.uid() and estado = 'esperando' and vence_en > now();
  if not found then raise exception 'Ya no estás en la lista'; end if;
end;
$$;

-- "Me fui" (R62)
create function public.me_fui()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.lista_gina set estado = 'se_fue', cerrada_en = now()
   where pasajero_id = auth.uid() and estado = 'esperando';
  if not found then raise exception 'Ya no estás en la lista'; end if;
end;
$$;

-- La lista, en orden (R63): lo que ve cualquiera con sesión
create function public.lista_de_gina()
returns table (id uuid, posicion int, nombre text, foto_path text, personas int, en_gina boolean, lugar text,
               creada_en timestamptz, vence_en timestamptz, es_mio boolean)
language sql stable security definer set search_path = '' as $$
  select l.id, (row_number() over (order by l.creada_en, l.id))::int, public.nombre_corto(pf.nombre), pf.foto_path,
         l.personas, l.en_gina, l.lugar, l.creada_en, l.vence_en, l.pasajero_id = auth.uid()
    from public.lista_gina l join public.perfiles pf on pf.id = l.pasajero_id
   where auth.uid() is not null and l.estado = 'esperando' and l.vence_en > now()
   order by l.creada_en, l.id;
$$;

-- Vencidas: se cierran solas cada minuto; mientras tanto, las consultas ignoran las que pasaron su hora
create function public.vencer_lista_gina()
returns void language sql security definer set search_path = '' as $$
  update public.lista_gina set estado = 'vencida', cerrada_en = vence_en
   where estado = 'esperando' and vence_en <= now();
$$;
select cron.schedule('vencer-lista-gina', '* * * * *', $$select public.vencer_lista_gina()$$);

-- ---------- El carro en Gina (R64–R66) ----------

-- El plan de un carro: recorre la lista en orden hasta llenar los puestos. "llamar": está en Gina y entra;
-- "guardar": está en el camino y se le guarda puesto; "despues": no entra (o su grupo no cabe) y sigue en su lugar.
-- "cabe": para los de Gina, si se lo puede subir ya (cuentan solo los puestos guardados a los del camino que van
-- antes: a un "llamar" que no aparece se lo salta, R65). p_excluir: lo que ya tiene otro carro que llegó antes.
create function public._plan_gina(p_viaje uuid, p_excluir uuid[] default '{}')
returns table (entrada_id uuid, rol text, cabe boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_libres int;
  v_quedan int;
  v_guardados int := 0;
  e record;
begin
  select puestos - ocupados into v_libres from public.viajes where id = p_viaje;
  v_quedan := v_libres;
  for e in select l.id, l.personas, l.en_gina from public.lista_gina l
            where l.estado = 'esperando' and l.vence_en > now() and l.id <> all (p_excluir)
            order by l.creada_en, l.id
  loop
    entrada_id := e.id;
    if e.personas <= v_quedan then
      rol := case when e.en_gina then 'llamar' else 'guardar' end;
      v_quedan := v_quedan - e.personas;
    else
      rol := 'despues';
    end if;
    cabe := case when e.en_gina then v_libres - v_guardados >= e.personas else rol = 'guardar' end;
    if rol = 'guardar' then v_guardados := v_guardados + e.personas; end if;
    return next;
  end loop;
end;
$$;

-- Lo que ya tienen los carros que llegaron a Gina antes que este (R64: dos carros a la vez)
create function public._ocupado_por_otros(p_viaje uuid)
returns uuid[] language plpgsql stable security definer set search_path = '' as $$
declare
  v public.viajes;
  c record;
  v_excluir uuid[] := '{}';
begin
  select * into v from public.viajes where id = p_viaje;
  for c in select id from public.viajes
            where sentido = 'centro_a_vg' and estado = 'en_parada' and id <> v.id
              and (estado_en, id) < (v.estado_en, v.id)
            order by estado_en, id
  loop
    v_excluir := v_excluir || array(select entrada_id from public._plan_gina(c.id, v_excluir) where rol <> 'despues');
  end loop;
  return v_excluir;
end;
$$;

-- El plan que ve el chofer (R64), con lo que necesita para llamar (teléfono) y llegar (GPS)
create function public.plan_de_gina(p_viaje uuid)
returns table (id uuid, posicion int, nombre text, foto_path text, personas int, en_gina boolean, lugar text,
               rol text, cabe boolean, telefono text, lat double precision, lng double precision, creada_en timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v public.viajes;
begin
  perform public._exigir_chofer();
  -- Que el viaje sea suyo, sin bloquear la fila: la API corre las funciones stable en modo solo lectura
  select vj.* into v from public.viajes vj where vj.id = p_viaje and vj.chofer_id = auth.uid();
  if v.id is null then raise exception 'Ese viaje no es tuyo'; end if;
  if v.sentido <> 'centro_a_vg' then raise exception 'La lista de Gina es solo para Centro → Valle Grande'; end if;
  return query
    with orden as (
      select l.id, (row_number() over (order by l.creada_en, l.id))::int as posicion
        from public.lista_gina l where l.estado = 'esperando' and l.vence_en > now()
    )
    select l.id, o.posicion, public.nombre_corto(pf.nombre), pf.foto_path, l.personas, l.en_gina, l.lugar,
           pl.rol, pl.cabe, pp.telefono, lp.lat, lp.lng, l.creada_en
      from public._plan_gina(v.id, public._ocupado_por_otros(v.id)) pl
      join public.lista_gina l on l.id = pl.entrada_id
      join orden o on o.id = l.id
      join public.perfiles pf on pf.id = l.pasajero_id
      left join public.perfiles_privados pp on pp.id = l.pasajero_id
      left join public.lista_gina_privado lp on lp.id = l.id
     order by o.posicion;
end;
$$;

-- "Subió" desde la lista (R64, R67): en Gina, si cabe según el plan; en ruta, un aviso del camino sin carro
create function public.subio_de_lista(p_entrada uuid, p_viaje uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.viajes;
  e public.lista_gina;
  v_cabe boolean;
  v_reserva uuid;
  v_lat double precision;
  v_lng double precision;
begin
  perform public._exigir_chofer();
  perform 1 from public.viajes where id = p_viaje for update; -- un "Subió" a la vez por carro
  v := public._mi_viaje(p_viaje);
  if v.sentido <> 'centro_a_vg' then raise exception 'La lista de Gina es solo para Centro → Valle Grande'; end if;
  select * into e from public.lista_gina where id = p_entrada for update;
  if e.id is null or e.estado <> 'esperando' or e.vence_en <= now() then raise exception 'Esa persona ya no está en la lista'; end if;

  if v.estado = 'en_parada' then
    select pl.cabe into v_cabe from public._plan_gina(v.id, public._ocupado_por_otros(v.id)) pl where pl.entrada_id = e.id;
    if not coalesce(v_cabe, false) then
      raise exception '%', case when e.personas > 1 then 'No caben todos: el grupo espera el siguiente carro'
                                else 'No hay puesto: los que quedan están guardados para gente del camino' end;
    end if;
  elsif v.estado = 'en_ruta' then
    if e.en_gina then raise exception 'Ya saliste de Gina'; end if;
    if v.puestos - v.ocupados < e.personas then raise exception 'Vas lleno'; end if;
  else
    raise exception 'Marca "Ya llegué" a Gina antes de subir a alguien';
  end if;

  select lp.lat, lp.lng into v_lat, v_lng from public.lista_gina_privado lp where lp.id = e.id;
  insert into public.reservas (viaje_id, pasajero_id, lugar, lat, lng, personas, estado, listo, en_camino, aceptada_en)
  values (v.id, e.pasajero_id, coalesce(e.lugar, 'Gina'), v_lat, v_lng, e.personas, 'subio', true, v.estado = 'en_ruta', now())
  returning id into v_reserva;
  update public.lista_gina set estado = 'subio', viaje_id = v.id, reserva_id = v_reserva, cerrada_en = now() where id = e.id;
  return v_reserva;
end;
$$;

-- "No estaba" (R65): el chofer lo llamó y no apareció
create function public.no_estaba_en_lista(p_entrada uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public._exigir_chofer();
  if not exists (select 1 from public.viajes where chofer_id = auth.uid() and sentido = 'centro_a_vg'
                  and estado in ('en_parada', 'en_ruta')) then
    raise exception 'Solo desde Gina o en el camino';
  end if;
  update public.lista_gina set estado = 'no_estaba', cerrada_en = now() where id = p_entrada and estado = 'esperando';
  if not found then raise exception 'Esa persona ya no está en la lista'; end if;
end;
$$;

-- Al salir de Gina (R66): los del camino con puesto guardado quedan como reservas activas del carro
create function public._vincular_camino(p_viaje uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e record;
  v_reserva uuid;
begin
  for e in select l.id, l.pasajero_id, l.lugar, l.personas, lp.lat, lp.lng
             from public._plan_gina(p_viaje, public._ocupado_por_otros(p_viaje)) pl
             join public.lista_gina l on l.id = pl.entrada_id
             left join public.lista_gina_privado lp on lp.id = l.id
            where pl.rol = 'guardar'
            order by l.creada_en, l.id
  loop
    insert into public.reservas (viaje_id, pasajero_id, lugar, lat, lng, personas, en_camino, aceptada_en)
    values (p_viaje, e.pasajero_id, e.lugar, e.lat, e.lng, e.personas, true, now())
    returning id into v_reserva;
    update public.lista_gina set estado = 'en_carro', viaje_id = p_viaje, reserva_id = v_reserva, cerrada_en = now()
     where id = e.id;
  end loop;
end;
$$;

-- Avanzar el viaje: igual que antes, más el vínculo de los del camino al salir de Gina (R66)
create or replace function public.avanzar_viaje(p_viaje uuid, p_estado public.estado_viaje)
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
    -- Sale sin haber respondido: esas solicitudes se rechazan (R58)
    update public.reservas set estado = 'rechazada', pendiente = false, cerrada_en = now()
     where viaje_id = v.id and estado = 'activa' and pendiente;
    -- Suben los que tienen puesto (su "hasta" cabe); la lista de espera queda sin puesto (R14, R57)
    update public.reservas res
       set estado = case when t.hasta <= v.puestos then 'subio'::public.estado_reserva
                         else 'sin_puesto'::public.estado_reserva end,
           cerrada_en = case when t.hasta <= v.puestos then null else now() end
      from (select id, sum(personas) over (order by creado_en, id) as hasta
              from public.reservas where viaje_id = v.id and estado = 'activa') t
     where res.id = t.id;
    -- Centro → Valle Grande: el carro se lleva a los del camino a los que les guardaba puesto (R66)
    if v.sentido = 'centro_a_vg' then perform public._vincular_camino(v.id); end if;
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

-- Apartar: en Centro → Valle Grande ya no se aparta (R62). El resto, igual
create or replace function public.reservar(
  p_viaje uuid,
  p_lugar text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_personas int default 1
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.viajes;
  v_en_ruta boolean;
  v_libres int;
  v_id uuid;
begin
  perform public._exigir_pasajero();
  if p_personas is null or p_personas not between 1 and 4 then
    raise exception 'Pueden viajar de 1 a 4 personas por reserva';
  end if;
  select * into v from public.viajes where id = p_viaje for update;
  if v.id is null then raise exception 'Ese viaje no existe'; end if;
  if v.sentido = 'centro_a_vg' then
    raise exception 'En Centro → Valle Grande no se aparta puesto: avisa que estás en Gina';
  end if;
  if not public._acepta_reservas(v) then
    raise exception '%', case when v.estado = 'en_ruta' then 'Ese carro ya va lleno' else 'Este viaje ya no acepta reservas' end;
  end if;
  perform public._validar_lugar(p_lugar, p_lat, p_lng);

  v_en_ruta := v.estado = 'en_ruta';
  perform public._cerrar_reserva_activa(auth.uid());   -- un solo lugar activo (R18)
  perform public._cerrar_espera(auth.uid(), 'reservo');

  select puestos - ocupados into v_libres from public.viajes where id = v.id;
  -- Puestos para todos o nada: no hay lista de espera (R59); el grupo viaja junto (R57)
  if v_libres < p_personas then
    raise exception '%', case
      when v_libres <= 0 then 'Ese carro ya va lleno'
      when v_libres = 1 then format('Solo queda 1 puesto para %s personas', p_personas)
      else format('Solo quedan %s puestos para %s personas', v_libres, p_personas) end;
  end if;

  -- Al apartar, el puesto queda garantizado (R58 eliminada). En ruta es un pedido: el chofer decide (R29)
  insert into public.reservas (viaje_id, pasajero_id, lugar, lat, lng, en_camino, pendiente, personas)
  values (v.id, auth.uid(), nullif(trim(coalesce(p_lugar, '')), ''), p_lat, p_lng, v_en_ruta, v_en_ruta, p_personas)
  returning id into v_id;
  return v_id;
end;
$$;

-- Teléfono: los choferes conectados ven el de quien espera en la lista, para llamarlo (§6, R65)
create or replace function public.puede_ver_telefono(p_objetivo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    auth.uid() = p_objetivo
    or public.es_admin()
    -- El teléfono de un chofer: lo ven los demás choferes y los pasajeros con reserva en sus viajes abiertos
    or (exists (select 1 from public.perfiles o where o.id = p_objetivo and o.rol = 'chofer')
        and (public.es_chofer()
             or exists (select 1 from public.reservas r join public.viajes v on v.id = r.viaje_id
                         where v.chofer_id = p_objetivo and r.pasajero_id = auth.uid()
                           and r.estado in ('activa', 'subio')
                           and v.estado not in ('finalizado', 'cancelado'))))
    -- El teléfono de un pasajero: solo su chofer (viaje abierto o de los últimos 7 días). Esperar no lo expone (R31).
    or (public.es_chofer()
        and exists (select 1 from public.reservas r join public.viajes v on v.id = r.viaje_id
                     where r.pasajero_id = p_objetivo and v.chofer_id = auth.uid()
                       and r.estado in ('activa', 'subio', 'bajo')
                       and (v.estado not in ('finalizado', 'cancelado') or v.llegada_en > now() - interval '7 days')))
    -- …y, en la Lista de Gina, los choferes conectados mientras la persona espera
    or (public.es_chofer()
        and exists (select 1 from public.perfiles yo where yo.id = auth.uid() and yo.conectado_en is not null)
        and exists (select 1 from public.lista_gina l where l.pasajero_id = p_objetivo and l.estado = 'esperando' and l.vence_en > now()));
$$;

-- La lista del tramo para todos los choferes (R63), con o sin viaje: dónde espera cada uno, su GPS (para llegar) y,
-- si el chofer está conectado, el teléfono para llamarlo (§6). Sin bloquear filas: la API la corre en solo lectura.
create function public.lista_para_choferes()
returns table (id uuid, posicion int, nombre text, foto_path text, personas int, en_gina boolean, lugar text,
               creada_en timestamptz, telefono text, lat double precision, lng double precision)
language plpgsql stable security definer set search_path = '' as $$
declare v_conectado boolean;
begin
  perform public._exigir_chofer();
  select pf.conectado_en is not null into v_conectado from public.perfiles pf where pf.id = auth.uid();
  return query
    select l.id, (row_number() over (order by l.creada_en, l.id))::int, public.nombre_corto(pf.nombre), pf.foto_path,
           l.personas, l.en_gina, l.lugar, l.creada_en, case when v_conectado then pp.telefono end, lp.lat, lp.lng
      from public.lista_gina l
      join public.perfiles pf on pf.id = l.pasajero_id
      left join public.perfiles_privados pp on pp.id = l.pasajero_id
      left join public.lista_gina_privado lp on lp.id = l.id
     where l.estado = 'esperando' and l.vence_en > now()
     order by l.creada_en, l.id;
end;
$$;

-- ---------- Permisos ----------
revoke execute on function public._plan_gina(uuid, uuid[]) from anon, public, authenticated;
revoke execute on function public._ocupado_por_otros(uuid) from anon, public, authenticated;
revoke execute on function public._vincular_camino(uuid) from anon, public, authenticated;
revoke execute on function public.vencer_lista_gina() from anon, public, authenticated;
revoke execute on function public.estoy_en_lista(boolean, text, double precision, double precision, int, int) from anon, public;
revoke execute on function public.sigo_en_lista() from anon, public;
revoke execute on function public.me_fui() from anon, public;
revoke execute on function public.lista_de_gina() from anon, public;
revoke execute on function public.plan_de_gina(uuid) from anon, public;
revoke execute on function public.lista_para_choferes() from anon, public;
revoke execute on function public.subio_de_lista(uuid, uuid) from anon, public;
revoke execute on function public.no_estaba_en_lista(uuid) from anon, public;
grant execute on function public.estoy_en_lista(boolean, text, double precision, double precision, int, int) to authenticated;
grant execute on function public.sigo_en_lista() to authenticated;
grant execute on function public.me_fui() to authenticated;
grant execute on function public.lista_de_gina() to authenticated;
grant execute on function public.plan_de_gina(uuid) to authenticated;
grant execute on function public.lista_para_choferes() to authenticated;
grant execute on function public.subio_de_lista(uuid, uuid) to authenticated;
grant execute on function public.no_estaba_en_lista(uuid) to authenticated;
