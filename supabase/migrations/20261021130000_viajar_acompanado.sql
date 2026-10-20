-- =====================================================================================
-- Viajar acompañado (docs/especificacion.md R57): una reserva o una espera puede ser de 1 a 4 personas.
-- Los puestos cuentan personas: cada reserva ocupa del puesto "desde" al "hasta" según la suma de las anteriores
-- (orden por hora del servidor, R17) y tiene puesto si su "hasta" ≤ puestos del carro. El grupo viaja junto.
-- =====================================================================================

alter table public.reservas
  add column personas int not null default 1 check (personas between 1 and 4);
alter table public.esperas
  add column personas int not null default 1 check (personas between 1 and 4);

-- ---------- Ocupados = personas, no reservas ----------
create or replace function public.actualizar_ocupados()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viaje uuid := coalesce(new.viaje_id, old.viaje_id);
begin
  update public.viajes
     set ocupados = (select coalesce(sum(r.personas), 0) from public.reservas r
                      where r.viaje_id = v_viaje and r.estado in ('activa', 'subio'))
   where id = v_viaje;
  return null;
end;
$$;

-- ---------- Último puesto de una reserva ("hasta"): la suma de personas hasta ella inclusive (R17, R57) ----------
-- Con puesto si hasta ≤ puestos del carro; si no, en lista de espera.
create or replace function public.posicion_reserva(p_reserva uuid)
returns int language sql stable security definer set search_path = '' as $$
  select hasta::int from (
    select r.id, sum(r.personas) over (order by r.creado_en, r.id) as hasta
      from public.reservas r
     where r.viaje_id = (select viaje_id from public.reservas where id = p_reserva)
       and r.estado in ('activa', 'subio')
  ) t where t.id = p_reserva;
$$;

-- ---------- Reservar para 1 a 4 personas (R16–R29, R57) ----------
drop function public.reservar(uuid, text, double precision, double precision);
create function public.reservar(
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
  if not public._acepta_reservas(v) then
    raise exception '%', case when v.estado = 'en_ruta' then 'Ese carro ya va lleno' else 'Este viaje ya no acepta reservas' end;
  end if;
  perform public._validar_lugar(p_lugar, p_lat, p_lng);

  v_en_ruta := v.estado = 'en_ruta';
  perform public._cerrar_reserva_activa(auth.uid());   -- un solo lugar activo (R18)
  perform public._cerrar_espera(auth.uid(), 'reservo');

  -- Puestos libres después de soltar la reserva anterior (si era en este mismo carro, la libera)
  select puestos - ocupados into v_libres from public.viajes where id = v.id;
  -- El grupo viaja junto: puestos para todos o nada (R57). En el camino, también (R28)
  if (p_personas > 1 or v_en_ruta) and v_libres < p_personas then
    raise exception '%', case
      when v_libres <= 0 then 'Ese carro ya va lleno'
      when v_libres = 1 then format('Solo queda 1 puesto para %s personas', p_personas)
      else format('Solo quedan %s puestos para %s personas', v_libres, p_personas) end;
  end if;

  insert into public.reservas (viaje_id, pasajero_id, lugar, lat, lng, en_camino, pendiente, personas)
  values (v.id, auth.uid(), nullif(trim(coalesce(p_lugar, '')), ''), p_lat, p_lng,
          v_en_ruta, v_en_ruta, p_personas)  -- en ruta: pedido en el camino, el chofer decide (R29)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- Lista pública del viaje: con cuántas personas y qué puestos ocupa cada reserva ----------
drop function public.lista_viaje(uuid);
create function public.lista_viaje(p_viaje uuid)
returns table (
  posicion int,     -- orden en la lista (1 = primera reserva)
  nombre_corto text,
  personas int,
  desde int,        -- primer puesto que ocupa
  hasta int,        -- último puesto que ocupa
  confirmado boolean,
  listo boolean,
  en_camino boolean,
  pendiente boolean,
  es_mio boolean
)
language sql stable security definer set search_path = '' as $$
  select t.pos::int,
         coalesce(public.nombre_corto(p.nombre), t.nombre),
         t.personas,
         (t.hasta - t.personas + 1)::int,
         t.hasta::int,
         t.hasta <= v.puestos,
         t.listo, t.en_camino, t.pendiente,
         t.pasajero_id is not distinct from auth.uid() and t.pasajero_id is not null
    from (select r.*,
                 row_number() over (order by r.creado_en, r.id) as pos,
                 sum(r.personas) over (order by r.creado_en, r.id) as hasta
            from public.reservas r
           where r.viaje_id = p_viaje and r.estado in ('activa', 'subio')) t
    join public.viajes v on v.id = t.viaje_id
    left join public.perfiles p on p.id = t.pasajero_id
   where auth.uid() is not null
   order by t.pos;
$$;

-- ---------- Al salir: suben las reservas que caben enteras; las demás quedan sin puesto (R14, R57) ----------
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
    -- Los que tienen puesto (su "hasta" cabe) suben; la lista de espera queda sin puesto, sin asignarla a otro carro
    update public.reservas res
       set estado = case when t.hasta <= v.puestos then 'subio'::public.estado_reserva
                         else 'sin_puesto'::public.estado_reserva end,
           cerrada_en = case when t.hasta <= v.puestos then null else now() end
      from (select id, sum(personas) over (order by creado_en, id) as hasta
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

-- ---------- Esperar con cuántos van (R31, R57) ----------
drop function public.marcar_espera(public.sentido, text, double precision, double precision);
create function public.marcar_espera(
  p_sentido public.sentido,
  p_lugar text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_personas int default 1
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._exigir_pasajero();
  if p_sentido is null then raise exception 'Indica hacia dónde vas'; end if;
  if p_personas is null or p_personas not between 1 and 4 then
    raise exception 'Pueden viajar de 1 a 4 personas por reserva';
  end if;
  perform public._validar_lugar(p_lugar, p_lat, p_lng);
  perform public._cerrar_espera(auth.uid(), 'cancelada');
  insert into public.esperas (pasajero_id, sentido, lugar, lat, lng, personas)
  values (auth.uid(), p_sentido, nullif(trim(coalesce(p_lugar, '')), ''), p_lat, p_lng, p_personas)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- La demanda cuenta personas (R31, R57) ----------
create or replace function public.demanda_por_sentido()
returns table (sentido public.sentido, esperando int)
language sql stable security definer set search_path = '' as $$
  select s.sentido, coalesce(sum(e.personas), 0)::int
    from unnest(enum_range(null::public.sentido)) as s(sentido)
    left join public.esperas e
      on e.sentido = s.sentido and e.estado = 'esperando' and e.creado_en > now() - interval '2 hours'
   where auth.uid() is not null
   group by s.sentido;
$$;

drop function public.esperan_conmigo();
create function public.esperan_conmigo()
returns table (nombre_corto text, personas int, desde timestamptz, soy_yo boolean)
language sql stable security definer set search_path = '' as $$
  with mia as (
    select sentido from public.esperas
     where pasajero_id = auth.uid() and estado = 'esperando' and creado_en > now() - interval '2 hours'
  )
  select public.nombre_corto(p.nombre), e.personas, e.creado_en, e.pasajero_id = auth.uid()
    from public.esperas e
    join mia on mia.sentido = e.sentido
    join public.perfiles p on p.id = e.pasajero_id
   where e.estado = 'esperando' and e.creado_en > now() - interval '2 hours'
   order by e.creado_en;
$$;

-- ---------- Panel del admin: personas en vez de reservas ----------
drop function public.admin_demanda();
create function public.admin_demanda()
returns table (
  id          uuid,
  pasajero_id uuid,
  nombre      text,
  telefono    text,
  foto_path   text,
  sentido     public.sentido,
  personas    int,
  lugar       text,
  lat         double precision,
  lng         double precision,
  creado_en   timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
    select e.id, e.pasajero_id, p.nombre, pp.telefono, p.foto_path, e.sentido, e.personas, e.lugar, e.lat, e.lng, e.creado_en
      from public.esperas e
      join public.perfiles p on p.id = e.pasajero_id
      left join public.perfiles_privados pp on pp.id = e.pasajero_id
     where e.estado = 'esperando' and e.creado_en > now() - interval '2 hours'
     order by e.creado_en;
end;
$$;

create or replace function public.admin_resumen()
returns table (
  viajes_en_curso     int,
  pasajeros_esperando int,
  viajes_hoy          int,
  pasajeros_hoy       int,
  estrellas_7d        numeric,
  calificaciones_7d   int,
  registros_7d        int
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_hoy date := (now() at time zone 'America/Caracas')::date;
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
  with terminados_hoy as (
    select v.id from public.viajes v
     where v.estado = 'finalizado' and (v.llegada_en at time zone 'America/Caracas')::date = v_hoy
  )
  select
    (select count(*)::int from public.viajes where estado in ('en_camino', 'llegando', 'en_parada', 'en_ruta')),
    (select coalesce(sum(personas), 0)::int from public.esperas where estado = 'esperando' and creado_en > now() - interval '2 hours'),
    (select count(*)::int from terminados_hoy),
    (select coalesce(sum(r.personas), 0)::int from public.reservas r
      where r.viaje_id in (select id from terminados_hoy) and r.estado in ('subio', 'bajo')),
    (select round(avg(estrellas), 1) from public.calificaciones where creado_en > now() - interval '7 days'),
    (select count(*)::int from public.calificaciones where creado_en > now() - interval '7 days'),
    (select count(*)::int from public.perfiles where rol <> 'admin' and creado_en > now() - interval '7 days');
end;
$$;

create or replace function public.admin_uso_por_chofer(p_desde timestamptz)
returns table (chofer_id uuid, nombre text, app int, en_camino int, a_mano int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo para administración'; end if;
  return query
    select v.chofer_id, p.nombre,
           (coalesce(sum(r.personas) filter (where r.pasajero_id is not null and not r.en_camino), 0))::int,
           (coalesce(sum(r.personas) filter (where r.pasajero_id is not null and r.en_camino), 0))::int,
           (coalesce(sum(r.personas) filter (where r.pasajero_id is null), 0))::int
      from public.reservas r
      join public.viajes v on v.id = r.viaje_id
      join public.perfiles p on p.id = v.chofer_id
     where v.estado = 'finalizado' and v.llegada_en >= p_desde and r.estado in ('subio', 'bajo')
     group by v.chofer_id, p.nombre
     order by sum(r.personas) desc;
end;
$$;

revoke execute on function
  public.reservar(uuid, text, double precision, double precision, int),
  public.lista_viaje(uuid),
  public.marcar_espera(public.sentido, text, double precision, double precision, int),
  public.esperan_conmigo(),
  public.admin_demanda()
from anon, public;
grant execute on function
  public.reservar(uuid, text, double precision, double precision, int),
  public.lista_viaje(uuid),
  public.marcar_espera(public.sentido, text, double precision, double precision, int),
  public.esperan_conmigo(),
  public.admin_demanda()
to authenticated;
