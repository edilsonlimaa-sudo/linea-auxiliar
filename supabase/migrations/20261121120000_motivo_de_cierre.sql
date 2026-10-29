-- R24 (interfaz nueva): cuando el chofer cancela, el pasajero que tenía puesto ve por qué. viaje_cierres solo lo leen
-- el admin y el chofer (puede llevar un texto libre); esta función le da al pasajero de ese viaje solo quién lo cerró y
-- el motivo escogido (nunca el detalle escrito)

create function public.motivo_de_cierre(p_reserva uuid)
returns table (por text, motivo text)
language sql
stable
security definer
set search_path = public
as $$
  select c.por, c.motivo
    from public.reservas r
    join public.viaje_cierres c on c.viaje_id = r.viaje_id
   where r.id = p_reserva
     and r.pasajero_id = auth.uid()
   order by c.en desc
   limit 1;
$$;

revoke execute on function public.motivo_de_cierre(uuid) from public, anon;
grant execute on function public.motivo_de_cierre(uuid) to authenticated;
