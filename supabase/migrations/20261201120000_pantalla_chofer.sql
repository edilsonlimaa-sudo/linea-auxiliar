-- Fase 0 de la app nativa (docs/app-nativo.md §3.3): la pantalla de Inicio del chofer en una sola función, para que la
-- app (que no tiene el servidor de Next) lea lo mismo que arma hoy lib/datos/inicio-chofer.ts. Primera parte: su
-- conexión, su carro, la cuota del día y sus viajes abiertos con la lista de cada carro (R17, R57). La lista de Gina
-- (plan_de_gina, lista_para_choferes) y los compañeros ya tienen sus funciones y la app las llama aparte.

create function public.pantalla_chofer()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_yo uuid := (public._exigir_chofer()).id;
begin
  return jsonb_build_object(
    'conectado', (select p.conectado_en is not null from public.perfiles p where p.id = v_yo),
    'vehiculo', (select jsonb_build_object('unidad', h.unidad, 'placa', h.placa) from public.vehiculos h where h.chofer_id = v_yo),
    -- Para sugerir sentido y puestos al publicar
    'ultimo', (select jsonb_build_object('sentido', v.sentido, 'puestos', v.puestos)
                 from public.viajes v where v.chofer_id = v_yo and v.estado <> 'cancelado'
                order by v.creado_en desc limit 1),
    -- R76–R78: la cuota de hoy (rige, monto, Pago Móvil de la línea y si ya está habilitado)
    'cuota', (select to_jsonb(c) from public.cuota_de_hoy() c),
    -- Sus viajes abiertos, del más viejo al más nuevo, cada uno con la lista de su carro
    'viajes', coalesce((
      select jsonb_agg(to_jsonb(v) || jsonb_build_object('lista', (
               select coalesce(jsonb_agg(jsonb_build_object(
                        'id', r.id,
                        'posicion', r.posicion,
                        'personas', r.personas,
                        'desde', r.hasta - r.personas + 1,
                        'hasta', r.hasta,
                        'confirmado', r.hasta <= v.puestos,
                        -- El nombre corto de siempre ("Carmen R."); sin app, el que puso el chofer (R36)
                        'nombre', case
                                    when p.id is null then coalesce(r.nombre, 'Pasajero sin app')
                                    when (regexp_split_to_array(btrim(p.nombre), '\s+'))[2] is null then (regexp_split_to_array(btrim(p.nombre), '\s+'))[1]
                                    else (regexp_split_to_array(btrim(p.nombre), '\s+'))[1] || ' ' || left((regexp_split_to_array(btrim(p.nombre), '\s+'))[2], 1) || '.'
                                  end,
                        'con_app', r.pasajero_id is not null,
                        'estado', r.estado,
                        'lugar', r.lugar,
                        'lat', r.lat,
                        'lng', r.lng,
                        'listo', r.listo,
                        'pendiente', r.pendiente,
                        'aceptada', r.aceptada_en is not null,
                        -- §6: el chofer ve el teléfono de quien tiene reserva en su viaje
                        'telefono', pp.telefono,
                        'foto_path', p.foto_path,
                        'gratis', r.gratis
                      ) order by r.posicion), '[]'::jsonb)
                 from (select x.*, row_number() over w as posicion, sum(x.personas) over w as hasta
                         from public.reservas x
                        where x.viaje_id = v.id and x.estado in ('activa', 'subio')
                       window w as (order by x.creado_en, x.id)) r
                 left join public.perfiles p on p.id = r.pasajero_id
                 left join public.perfiles_privados pp on pp.id = r.pasajero_id
             )) order by v.creado_en)
        from public.viajes v
       where v.chofer_id = v_yo and v.estado in ('programado', 'en_camino', 'llegando', 'en_parada', 'en_ruta')
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.pantalla_chofer() from anon, public;
grant execute on function public.pantalla_chofer() to authenticated;
