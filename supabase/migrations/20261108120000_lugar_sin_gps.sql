-- R26: sin GPS del pasajero. El lugar escrito es obligatorio al apartar, al cambiar el lugar, al pedir "Avísame" y al
-- anotarse en otro punto del camino (la casilla del GPS hacía creer que el chofer buscaba a cada uno donde estaba).
-- Las coordenadas ya guardadas se siguen mostrando; En Gina el GPS solo confirma que está ahí (R62).

create or replace function public._validar_lugar(p_lugar text, p_lat double precision, p_lng double precision)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if nullif(trim(coalesce(p_lugar, '')), '') is null then
    raise exception 'Escribe dónde estás';
  end if;
  if char_length(trim(p_lugar)) > 60 then
    raise exception 'El lugar es muy largo (máximo 60 letras)';
  end if;
  if (p_lat is null) <> (p_lng is null) then
    raise exception 'Ubicación GPS incompleta';
  end if;
end;
$$;

create or replace function public.estoy_en_lista(p_en_gina boolean, p_lugar text DEFAULT NULL::text, p_lat double precision DEFAULT NULL::double precision, p_lng double precision DEFAULT NULL::double precision, p_personas integer DEFAULT 1, p_distancia_m integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.perfiles := public._exigir_aprobado();
  v_lugar text := nullif(btrim(coalesce(p_lugar, '')), '');
  v_id uuid;
begin
  if p.rol <> 'pasajero' then raise exception 'Solo los pasajeros se anotan en la lista'; end if;
  if p_personas is null or p_personas not between 1 and 4 then raise exception 'Pueden ir de 1 a 4 personas por aviso'; end if;
  if (p_lat is null) <> (p_lng is null) then raise exception 'Ubicación incompleta'; end if;
  if not coalesce(p_en_gina, false) then
    if v_lugar is null then raise exception 'Escribe dónde estás esperando'; end if;
    if char_length(coalesce(v_lugar, '')) > 60 then raise exception 'El lugar puede tener hasta 60 letras'; end if;
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
$function$
;
