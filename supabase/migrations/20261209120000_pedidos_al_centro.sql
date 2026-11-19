-- Quién pidió "Avísame cuando salga un carro" al Centro, para los choferes (docs/especificacion.md R117): nombre corto,
-- foto, cuántos van, desde cuándo y si ya se le avisó; el teléfono solo si el chofer está conectado (§6, como la lista
-- de Gina). Solo los pedidos vigentes (R94: esperando y sin vencer).
create function public.pedidos_al_centro()
returns table (id uuid, nombre text, foto_path text, personas int, pedido_en timestamptz, vence_en timestamptz,
               avisado_en timestamptz, telefono text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_conectado boolean;
  v_prueba boolean := public._es_prueba(auth.uid());
begin
  perform public._exigir_chofer();
  select pf.conectado_en is not null into v_conectado from public.perfiles pf where pf.id = auth.uid();
  return query
    select e.id, public.nombre_corto(pf.nombre), pf.foto_path, e.personas, e.creado_en, e.vence_en, e.avisado_en,
           case when v_conectado then pp.telefono end
      from public.esperas e
      join public.perfiles pf on pf.id = e.pasajero_id
      left join public.perfiles_privados pp on pp.id = e.pasajero_id
     where e.estado = 'esperando' and e.sentido = 'vg_a_centro' and e.vence_en is not null and e.vence_en > now()
       -- R91: el chofer de prueba solo ve a los pasajeros de prueba (como lista_para_choferes)
       and (not v_prueba or pf.de_prueba)
     order by e.creado_en, e.id;
end;
$$;
revoke execute on function public.pedidos_al_centro() from anon, public;
grant execute on function public.pedidos_al_centro() to authenticated;
