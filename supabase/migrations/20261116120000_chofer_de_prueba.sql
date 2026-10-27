-- R91: el chofer de prueba (perfiles.de_prueba, R86) solo lo ven él, las cuentas de prueba y el admin. No se cruza con la
-- gente real: nadie de verdad aparta en sus viajes, en la lista hacia Valle Grande solo atiende a pasajeros de prueba y
-- su carro en Gina no les quita puestos a los choferes reales. El pasajero de prueba sigue viendo y viajando como siempre.

create function public._es_prueba(p_persona uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select de_prueba from public.perfiles where id = p_persona), false)
$$;
revoke execute on function public._es_prueba(uuid) from anon, public, authenticated;

-- Se usa en las políticas (corre con el rol de quien lee): por eso es pública
create function public.puede_ver_chofer(p_chofer uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select p_chofer = auth.uid() or not public._es_prueba(p_chofer) or public._es_prueba(auth.uid()) or public.es_admin()
$$;
revoke execute on function public.puede_ver_chofer(uuid) from anon, public;
grant execute on function public.puede_ver_chofer(uuid) to authenticated;

-- ---------- Lo que se ve ----------
drop policy "viajes: leer con sesión" on public.viajes;
create policy "viajes: leer con sesión (sin el chofer de prueba)" on public.viajes
  for select to authenticated using (public.puede_ver_chofer(chofer_id));

drop policy "perfiles: leer con sesión" on public.perfiles;
create policy "perfiles: leer con sesión (sin el chofer de prueba)" on public.perfiles
  for select to authenticated using (rol <> 'chofer' or public.puede_ver_chofer(id));

drop policy "vehiculos: leer con sesión" on public.vehiculos;
create policy "vehiculos: leer con sesión (sin el chofer de prueba)" on public.vehiculos
  for select to authenticated using (public.puede_ver_chofer(chofer_id));

drop policy "calificaciones: leer con sesión" on public.calificaciones;
create policy "calificaciones: leer con sesión (sin el chofer de prueba)" on public.calificaciones
  for select to authenticated using (public.puede_ver_chofer(chofer_id));

drop policy "posiciones: choferes conectados" on public.posiciones;
create policy "posiciones: choferes conectados (sin el chofer de prueba)" on public.posiciones
  for select to authenticated using (
    exists (select 1 from public.perfiles p where p.id = chofer_id and p.conectado_en is not null)
    and public.puede_ver_chofer(chofer_id)
  );

create or replace function public.choferes_en_pausa()
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
       and public.puede_ver_chofer(p.id)
       and (
         (pa.vuelve_en is not null and pa.vuelve_en > now() - interval '30 minutes')
         or (pa.vuelve_en is null
             and (pa.inicio at time zone 'America/Caracas')::date = (now() at time zone 'America/Caracas')::date)
       )
     order by pa.vuelve_en nulls last, pa.sin_hora desc, p.nombre;
end;
$$;

-- ---------- Lista hacia Valle Grande ----------
-- El carro de un chofer de prueba solo arma su plan con pasajeros de prueba
create or replace function public._plan_gina(p_viaje uuid, p_excluir uuid[] default '{}')
returns table (entrada_id uuid, rol text, cabe boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_libres int;
  v_quedan int;
  v_guardados int := 0;
  v_prueba boolean;
  e record;
begin
  select puestos - ocupados, public._es_prueba(chofer_id) into v_libres, v_prueba from public.viajes where id = p_viaje;
  v_quedan := v_libres;
  for e in select l.id, l.personas, l.en_gina from public.lista_gina l
            where l.estado = 'esperando' and l.vence_en > now() and l.id <> all (p_excluir)
              and (not v_prueba or public._es_prueba(l.pasajero_id))
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

-- Los carros que llegaron antes a Gina solo cuentan entre choferes del mismo tipo (reales con reales)
create or replace function public._ocupado_por_otros(p_viaje uuid)
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
              and public._es_prueba(chofer_id) = public._es_prueba(v.chofer_id)
            order by estado_en, id
  loop
    v_excluir := v_excluir || array(select entrada_id from public._plan_gina(c.id, v_excluir) where rol <> 'despues');
  end loop;
  return v_excluir;
end;
$$;

create or replace function public.lista_para_choferes()
 RETURNS TABLE(id uuid, posicion integer, nombre text, foto_path text, personas integer, en_gina boolean, lugar text, creada_en timestamp with time zone, telefono text, lat double precision, lng double precision, dice_que_subio boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_conectado boolean;
  v_prueba boolean := public._es_prueba(auth.uid());
begin
  perform public._exigir_chofer();
  -- Sin la cuota del día (y sin viaje abierto), la lista no es para él
  if not public._trabaja_hoy(auth.uid()) then return; end if;
  select pf.conectado_en is not null into v_conectado from public.perfiles pf where pf.id = auth.uid();
  return query
    select l.id, (row_number() over (order by l.creada_en, l.id))::int, public.nombre_corto(pf.nombre), pf.foto_path,
           l.personas, l.en_gina, l.lugar, l.creada_en, case when v_conectado then pp.telefono end, lp.lat, lp.lng,
           l.dice_que_subio is not null
      from public.lista_gina l
      join public.perfiles pf on pf.id = l.pasajero_id
      left join public.perfiles_privados pp on pp.id = l.pasajero_id
      left join public.lista_gina_privado lp on lp.id = l.id
     where l.estado = 'esperando' and l.vence_en > now()
       -- R91: el chofer de prueba solo ve a los pasajeros de prueba
       and (not v_prueba or pf.de_prueba)
     order by l.creada_en, l.id;
end;
$function$;

create or replace function public.lista_de_gina()
 RETURNS TABLE(id uuid, posicion integer, nombre text, foto_path text, personas integer, en_gina boolean, lugar text, creada_en timestamp with time zone, vence_en timestamp with time zone, es_mio boolean, dice_que_subio boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select l.id, (row_number() over (order by l.creada_en, l.id))::int, public.nombre_corto(pf.nombre), pf.foto_path,
         l.personas, l.en_gina, l.lugar, l.creada_en, l.vence_en, l.pasajero_id = auth.uid(), l.dice_que_subio is not null
    from public.lista_gina l join public.perfiles pf on pf.id = l.pasajero_id
   where auth.uid() is not null and l.estado = 'esperando'
     -- Un chofer sin la cuota del día (y sin viaje abierto) no ve quién espera
     and (not public.es_chofer() or public._trabaja_hoy(auth.uid())) and l.vence_en > now()
     -- R91: el chofer de prueba solo ve a los pasajeros de prueba
     and (not (public.es_chofer() and public._es_prueba(auth.uid())) or pf.de_prueba)
   order by l.creada_en, l.id;
$function$;

-- ---------- Que no se crucen ----------
-- Toda reserva (apartar, pedido en el camino, Subió de la lista, Voy) pasa por aquí
create function public._reserva_sin_cruce() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.pasajero_id is not null and not public._es_prueba(new.pasajero_id)
     and public._es_prueba((select chofer_id from public.viajes where id = new.viaje_id)) then
    raise exception 'Ese viaje ya no está disponible';
  end if;
  return new;
end;
$$;
revoke execute on function public._reserva_sin_cruce() from anon, public, authenticated;
create trigger reserva_sin_cruce before insert on public.reservas for each row execute function public._reserva_sin_cruce();

-- "No estaba" (y lo demás que cierra una anotación) de un chofer de prueba solo con pasajeros de prueba
create function public._lista_sin_cruce() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.estado = 'esperando' and new.estado <> 'esperando' and new.pasajero_id <> auth.uid()
     and public.es_chofer() and public._es_prueba(auth.uid()) and not public._es_prueba(new.pasajero_id) then
    raise exception 'Esa persona ya no está en la lista';
  end if;
  return new;
end;
$$;
revoke execute on function public._lista_sin_cruce() from anon, public, authenticated;
create trigger lista_sin_cruce before update on public.lista_gina for each row execute function public._lista_sin_cruce();
