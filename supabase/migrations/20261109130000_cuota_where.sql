-- R78: la nube rechaza UPDATE sin WHERE (pg_safeupdate): admin_guardar_cuota actualiza su única fila con where id

create or replace function public.admin_guardar_cuota(p_activa boolean, p_desde date, p_monto numeric, p_banco text, p_telefono text, p_cedula text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  -- Vacío = sin cargar (la app manda texto vacío)
  v_banco text := nullif(btrim(coalesce(p_banco, '')), '');
  v_telefono text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_cedula text := nullif(btrim(coalesce(p_cedula, '')), '');
begin
  if not public.es_admin() then raise exception 'Solo el administrador cambia la cuota'; end if;
  if p_monto is null or p_monto <= 0 then raise exception 'Escribe el monto de la cuota'; end if;
  if p_desde is null then raise exception 'Escoge desde qué día se cobra'; end if;
  if p_activa and (v_banco is null or v_telefono is null or v_cedula is null) then
    raise exception 'Carga tu Pago Móvil antes de activar la cuota';
  end if;
  update public.cuota_config
     set activa = p_activa, desde = p_desde, monto = p_monto, banco = v_banco, telefono = v_telefono, cedula = v_cedula,
         actualizada_en = now()
   where id;
end;
$$;
