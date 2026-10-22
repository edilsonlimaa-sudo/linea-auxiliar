-- R70: "Me atraso". Mientras va a recoger, el chofer da una hora nueva para que el pasajero vea una previsión real.
-- La puntualidad (R56) sigue contra lo primero que prometió; cada aviso queda en la línea de tiempo.

alter table public.viajes add column atraso_en timestamptz; -- último "Me atraso" (el pasajero ve "avisó que se atrasa")
alter table public.viaje_eventos add column atraso boolean not null default false; -- aviso de atraso, no cambio de estado

create function public.me_atraso(p_viaje uuid, p_minutos int)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.viajes;
  v_eta int;
begin
  perform public._exigir_chofer();
  v := public._mi_viaje(p_viaje);
  if v.estado <> 'en_camino' then raise exception 'Solo mientras vas a recoger'; end if;
  if p_minutos is null or p_minutos not between 1 and 120 then raise exception 'Escoge entre 1 y 120 minutos'; end if;
  -- La hora prometida es estado_en + eta_min: se corre para que llegue en p_minutos desde ahora
  v_eta := least(1440, ceil(extract(epoch from now() - v.estado_en) / 60)::int + p_minutos);
  update public.viajes set eta_min = v_eta, atraso_en = now() where id = v.id;
  insert into public.viaje_eventos (viaje_id, estado, eta_min, atraso) values (v.id, 'en_camino', v_eta, true);
end;
$$;

revoke execute on function public.me_atraso(uuid, int) from anon, public;
grant execute on function public.me_atraso(uuid, int) to authenticated;
