-- R76 (15/11/2026): la cuota del día pasa a ser un aporte voluntario para mantener la app en el aire. Quien no aporta
-- trabaja igual: publica, se conecta y ve la lista hacia Valle Grande. El aporte sigue igual (avisar_pago_cuota, el
-- admin lo aprueba o lo rechaza) y cuota_de_hoy().habilitado ahora solo dice si ya aportó hoy.

-- conectar, lista_para_choferes y lista_de_gina ya no cierran nada sin el aporte
create or replace function public._trabaja_hoy(p_chofer uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select true
$$;
revoke execute on function public._trabaja_hoy(uuid) from anon, public, authenticated;

-- publicar_viaje: lo mismo de antes, sin pedir el aporte
CREATE OR REPLACE FUNCTION public.publicar_viaje(p_sentido sentido, p_puestos integer, p_eta_min integer DEFAULT NULL::integer, p_hora_fija timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

;
