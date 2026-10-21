-- R67: "Voy" para quien espera en el camino cuando los carros ya salieron de Gina. El chofer en ruta la toma: queda
-- ligada a su carro (reserva activa, como al salir de Gina, R66), sale de la lista y del aviso de los demás choferes.
-- El primero que la toma se la lleva.

create function public.voy_por_el(p_entrada uuid, p_viaje uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.viajes;
  e public.lista_gina;
  lp public.lista_gina_privado;
  v_reserva uuid;
begin
  perform public._exigir_chofer();
  perform 1 from public.viajes where id = p_viaje for update; -- un aviso a la vez por carro
  v := public._mi_viaje(p_viaje);
  if v.sentido <> 'centro_a_vg' then raise exception 'La lista es solo para Centro → Valle Grande'; end if;
  if v.estado <> 'en_ruta' then raise exception 'Esto es para cuando ya saliste de Gina'; end if;

  select * into e from public.lista_gina where id = p_entrada for update;
  if e.id is null or e.estado <> 'esperando' or e.vence_en <= now() then
    raise exception 'Esa persona ya no está en la lista: otro carro va por ella o se fue';
  end if;
  if e.en_gina then raise exception 'Esa persona espera en Gina'; end if;
  if v.puestos - v.ocupados < e.personas then
    raise exception '%', case when e.personas > 1 then 'No caben todos en tu carro' else 'Vas lleno' end;
  end if;

  select * into lp from public.lista_gina_privado where id = e.id;
  insert into public.reservas (viaje_id, pasajero_id, lugar, lat, lng, personas, en_camino, aceptada_en)
  values (v.id, e.pasajero_id, e.lugar, lp.lat, lp.lng, e.personas, true, now())
  returning id into v_reserva;
  update public.lista_gina set estado = 'en_carro', viaje_id = v.id, reserva_id = v_reserva, cerrada_en = now() where id = e.id;
  return v_reserva;
end;
$$;

revoke execute on function public.voy_por_el(uuid, uuid) from anon, public;
grant execute on function public.voy_por_el(uuid, uuid) to authenticated;
