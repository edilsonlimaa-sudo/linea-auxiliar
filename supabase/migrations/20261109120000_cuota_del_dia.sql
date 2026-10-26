-- §5.18 Cuota del día (R76–R78): para publicar viajes el chofer necesita el día pagado. Paga por Pago Móvil a la
-- cuenta de la línea y avisa la referencia; el primer aviso del día habilita al momento ("en revisión") y el admin
-- lo aprueba o lo rechaza después. Rechazado: no publica más ese día; otro aviso ese día solo habilita aprobado.

-- Datos del cobro: una sola fila que edita el admin. Sin activar (y antes de "desde") nada cambia
create table public.cuota_config (
  id         boolean primary key default true check (id),
  activa     boolean not null default false,
  desde      date not null default '2026-10-26',
  monto      numeric(12, 2) not null default 1000 check (monto > 0),
  banco      text check (banco ~ '^\d{4}$'),
  telefono   text check (telefono ~ '^04\d{9}$'),
  cedula     text check (cedula ~ '^[VEJGP]\d{6,9}$'),
  actualizada_en timestamptz not null default now(),
  check (not activa or (banco is not null and telefono is not null and cedula is not null))
);
insert into public.cuota_config default values;

alter table public.cuota_config enable row level security;
create policy "cuota_config: solo el admin" on public.cuota_config for select to authenticated using (public.es_admin());
grant select on public.cuota_config to authenticated;

-- Los avisos de pago, uno por intento. "habilita" = fue el primero del día (libera mientras está en revisión)
create table public.cuota_pagos (
  id           uuid primary key default gen_random_uuid(),
  chofer_id    uuid not null references public.perfiles (id) on delete cascade,
  dia          date not null,
  referencia   text not null check (referencia ~ '^\d{4,20}$'),
  banco        text not null check (banco ~ '^\d{4}$'),
  monto        numeric(12, 2) not null,
  estado       text not null default 'revision' check (estado in ('revision', 'aprobado', 'rechazado')),
  habilita     boolean not null,
  motivo       text check (char_length(motivo) <= 140),
  creado_en    timestamptz not null default now(),
  decidido_en  timestamptz,
  decidido_por uuid references public.perfiles (id) on delete set null
);
-- Un aviso vivo (en revisión o aprobado) por chofer y día
create unique index cuota_pagos_uno_por_dia on public.cuota_pagos (chofer_id, dia) where estado <> 'rechazado';
create index cuota_pagos_dia on public.cuota_pagos (dia, estado);

alter table public.cuota_pagos enable row level security;
create policy "cuota_pagos: los propios o el admin" on public.cuota_pagos
  for select to authenticated using (chofer_id = auth.uid() or public.es_admin());
grant select on public.cuota_pagos to authenticated;
-- En vivo: el chofer ve al momento que el admin aprobó o rechazó; el panel, los avisos nuevos
alter publication supabase_realtime add table public.cuota_pagos;

create function public._hoy_caracas() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Caracas')::date
$$;
revoke execute on function public._hoy_caracas() from anon, public, authenticated;

-- ¿Se cobra hoy? (activa y desde ya)
create function public._cuota_rige() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select activa and desde <= public._hoy_caracas() from public.cuota_config), false)
$$;
revoke execute on function public._cuota_rige() from anon, public, authenticated;

-- R76: el chofer puede publicar hoy (sin cuota vigente, siempre)
create function public._dia_habilitado(p_chofer uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select not public._cuota_rige()
      or exists (select 1 from public.cuota_pagos
                  where chofer_id = p_chofer and dia = public._hoy_caracas()
                    and (estado = 'aprobado' or (estado = 'revision' and habilita)))
$$;
revoke execute on function public._dia_habilitado(uuid) from anon, public, authenticated;

-- Lo que ve el chofer: si hoy se cobra, cuánto, a qué Pago Móvil y si ya está habilitado
create function public.cuota_de_hoy()
returns table (rige boolean, monto numeric, banco text, telefono text, cedula text, habilitado boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._exigir_chofer();
  return query
    select public._cuota_rige(), c.monto, c.banco, c.telefono, c.cedula, public._dia_habilitado(auth.uid())
      from public.cuota_config c;
end;
$$;
revoke execute on function public.cuota_de_hoy() from anon, public;
grant execute on function public.cuota_de_hoy() to authenticated;

-- R77: avisar el pago del día
create function public.avisar_pago_cuota(p_referencia text, p_banco text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_ref text := regexp_replace(coalesce(p_referencia, ''), '\D', '', 'g');
  v_hoy date := public._hoy_caracas();
  v_id uuid;
begin
  perform public._exigir_chofer();
  if not public._cuota_rige() then raise exception 'Hoy no hay cuota que pagar'; end if;
  if v_ref !~ '^\d{4,20}$' then raise exception 'Escribe la referencia del Pago Móvil (solo números)'; end if;
  if coalesce(p_banco, '') !~ '^\d{4}$' then raise exception 'Escoge el banco desde el que pagaste'; end if;
  perform 1 from public.perfiles where id = auth.uid() for update; -- un aviso a la vez por chofer
  if exists (select 1 from public.cuota_pagos where chofer_id = auth.uid() and dia = v_hoy and estado <> 'rechazado') then
    raise exception 'Ya avisaste tu pago de hoy';
  end if;
  insert into public.cuota_pagos (chofer_id, dia, referencia, banco, monto, habilita)
  values (auth.uid(), v_hoy, v_ref, p_banco, (select monto from public.cuota_config),
          -- Solo el primer aviso del día habilita mientras está en revisión
          not exists (select 1 from public.cuota_pagos where chofer_id = auth.uid() and dia = v_hoy))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.avisar_pago_cuota(text, text) from anon, public;
grant execute on function public.avisar_pago_cuota(text, text) to authenticated;

-- R78: el admin aprueba o rechaza (y puede cambiar de decisión)
create function public.admin_decidir_pago(p_pago uuid, p_aprobar boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.cuota_pagos;
begin
  if not public.es_admin() then raise exception 'Solo el administrador revisa los pagos'; end if;
  select * into p from public.cuota_pagos where id = p_pago for update;
  if p.id is null then raise exception 'Ese aviso de pago no existe'; end if;
  if p_aprobar and p.estado = 'rechazado'
     and exists (select 1 from public.cuota_pagos where chofer_id = p.chofer_id and dia = p.dia and estado <> 'rechazado' and id <> p.id) then
    raise exception 'Ese chofer ya tiene otro aviso ese día: decide ese';
  end if;
  update public.cuota_pagos
     set estado = case when p_aprobar then 'aprobado' else 'rechazado' end,
         motivo = case when p_aprobar then null else nullif(btrim(coalesce(p_motivo, '')), '') end,
         decidido_en = now(), decidido_por = auth.uid()
   where id = p.id;
end;
$$;
revoke execute on function public.admin_decidir_pago(uuid, boolean, text) from anon, public;
grant execute on function public.admin_decidir_pago(uuid, boolean, text) to authenticated;

-- R78: los datos del cobro
create function public.admin_guardar_cuota(p_activa boolean, p_desde date, p_monto numeric, p_banco text, p_telefono text, p_cedula text)
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
         actualizada_en = now();
end;
$$;
revoke execute on function public.admin_guardar_cuota(boolean, date, numeric, text, text, text) from anon, public;
grant execute on function public.admin_guardar_cuota(boolean, date, numeric, text, text, text) to authenticated;

-- R76: publicar pide el día habilitado (lo demás de publicar_viaje, igual)
create or replace function public.publicar_viaje(p_sentido sentido, p_puestos integer, p_eta_min integer DEFAULT NULL::integer, p_hora_fija timestamp with time zone DEFAULT NULL::timestamp with time zone)
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
  if not public._dia_habilitado(auth.uid()) then
    raise exception 'Para publicar hoy, paga la cuota del día y avisa la referencia del Pago Móvil';
  end if;
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
$function$;
