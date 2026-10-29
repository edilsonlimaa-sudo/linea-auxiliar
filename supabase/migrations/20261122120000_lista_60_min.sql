-- R62: el aviso en la lista hacia Valle Grande vale 60 min (antes 30), renovable con "Sigo aquí". Con 30, 1 de cada 5
-- avisos vencidos perdió el lugar menos de 17 min antes de que llegara un carro (y en Gina pedían su puesto). Los avisos
-- que ya están en la lista conservan su hora; los nuevos, las renovaciones y quien vuelve a la lista usan 60 min.

alter table public.lista_gina alter column vence_en set default now() + interval '60 minutes';

-- "Sí, sigo aquí": 60 min más sin perder el lugar
create or replace function public.sigo_en_lista()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.lista_gina set vence_en = now() + interval '60 minutes'
   where pasajero_id = auth.uid() and estado = 'esperando' and vence_en > now();
  if not found then raise exception 'Ya no estás en la lista'; end if;
end;
$$;

-- "Me monté" (ya no se ofrece, R62) también deja el lugar por lo menos 60 min
create or replace function public.me_monte()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.lista_gina set dice_que_subio = now(), vence_en = greatest(vence_en, now() + interval '60 minutes')
   where pasajero_id = auth.uid() and estado = 'esperando' and vence_en > now();
  if not found then raise exception 'Ya no estás en la lista'; end if;
end;
$$;

-- Quien estaba en la lista y quedó con un carro que se cerró vuelve a su lugar (mismo creada_en), con 60 min por delante.
-- p_con_subio: también los que subieron en Gina (el viaje no llegó a salir). Si ya se anotó otra vez, no se toca.
create or replace function public._devolver_a_lista(p_viaje uuid, p_con_subio boolean)
returns void language sql security definer set search_path = '' as $$
  update public.lista_gina l
     set estado = 'esperando', viaje_id = null, reserva_id = null, cerrada_en = null, dice_que_subio = null,
         vence_en = now() + interval '60 minutes'
    from public.reservas r
   where l.viaje_id = p_viaje and r.id = l.reserva_id
     and ((l.estado = 'en_carro' and r.estado = 'activa') or (p_con_subio and l.estado = 'subio' and r.estado = 'subio'))
     and not exists (select 1 from public.lista_gina o where o.pasajero_id = l.pasajero_id and o.estado = 'esperando');
$$;
