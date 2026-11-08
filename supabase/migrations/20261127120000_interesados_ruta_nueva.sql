-- §5.24 Rutas nuevas (R96–R97): antes de abrir El Faro ⇄ Centro, una página pública recoge quién la usaría (pasajeros y
-- choferes). Sin cuenta: la escritura entra solo por registrar_interes (también para anon); leer, solo el admin.

create table public.interesados (
  id uuid primary key default gen_random_uuid(),
  ruta text not null check (ruta in ('faro')),
  rol text not null check (rol in ('pasajero', 'chofer')),
  nombre text not null check (char_length(nombre) between 3 and 80),
  telefono text not null check (telefono ~ '^\+584\d{9}$'),
  sector text not null check (char_length(sector) between 2 and 60),
  horarios text[] not null default '{}' check (horarios <@ array['temprano', 'manana', 'tarde', 'noche']),
  frecuencia text check (frecuencia in ('1-2', '3-4', 'casi_todos')),
  carro text check (char_length(carro) <= 60),
  comentario text check (char_length(comentario) <= 280),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (ruta, telefono)
);
comment on table public.interesados is 'R96: interesados en una ruta nueva (sin cuenta). Mismo teléfono en la misma ruta = la misma persona.';

alter table public.interesados enable row level security;
-- Sin políticas ni grants: nadie la lee ni la escribe directo (solo por las funciones de abajo)
revoke all on public.interesados from anon, authenticated;

-- R96: registrar (o actualizar) el interés. Pública: la llama la página /faro sin sesión
create function public.registrar_interes(
  p_ruta text, p_rol text, p_nombre text, p_telefono text, p_sector text,
  p_horarios text[] default '{}', p_frecuencia text default null, p_carro text default null, p_comentario text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_nombre text := btrim(regexp_replace(coalesce(p_nombre, ''), '\s+', ' ', 'g'));
  v_tel text := public.normalizar_telefono(p_telefono);
  v_sector text := btrim(coalesce(p_sector, ''));
  v_carro text := nullif(btrim(coalesce(p_carro, '')), '');
  v_comentario text := nullif(btrim(coalesce(p_comentario, '')), '');
  v_horarios text[] := coalesce((select array_agg(distinct h) from unnest(p_horarios) h where h is not null), '{}');
begin
  if p_ruta is distinct from 'faro' then raise exception 'Esa ruta no existe'; end if;
  if p_rol not in ('pasajero', 'chofer') then raise exception 'Escoge si serías pasajero o chofer'; end if;
  if char_length(v_nombre) < 3 then raise exception 'Escribe tu nombre y apellido'; end if;
  if char_length(v_nombre) > 80 then raise exception 'El nombre es muy largo'; end if;
  if v_tel !~ '^\+584\d{9}$' then raise exception 'Escribe tu número de WhatsApp, por ejemplo 0414-1234567'; end if;
  if char_length(v_sector) < 2 then raise exception 'Escribe en qué microcondominio vives'; end if;
  if char_length(v_sector) > 60 then raise exception 'El nombre del microcondominio es muy largo'; end if;
  if not v_horarios <@ array['temprano', 'manana', 'tarde', 'noche'] then raise exception 'Horario desconocido'; end if;
  if p_rol = 'pasajero' and p_frecuencia is not null and p_frecuencia not in ('1-2', '3-4', 'casi_todos') then
    raise exception 'Frecuencia desconocida';
  end if;
  if char_length(v_carro) > 60 then raise exception 'La descripción del carro es muy larga'; end if;
  if char_length(v_comentario) > 280 then raise exception 'El comentario es muy largo (máximo 280 letras)'; end if;

  -- Página abierta a cualquiera: un tope por hora frena el abuso sin molestar a la gente real
  if (select count(*) from public.interesados where ruta = p_ruta and actualizado_en > now() - interval '1 hour') >= 300 then
    raise exception 'Recibimos muchos registros en este momento. Intenta de nuevo en un rato.';
  end if;

  insert into public.interesados (ruta, rol, nombre, telefono, sector, horarios, frecuencia, carro, comentario)
  values (p_ruta, p_rol, v_nombre, v_tel, v_sector, v_horarios,
          case when p_rol = 'pasajero' then p_frecuencia end,
          case when p_rol = 'chofer' then v_carro end,
          v_comentario)
  on conflict (ruta, telefono) do update
     set rol = excluded.rol, nombre = excluded.nombre, sector = excluded.sector, horarios = excluded.horarios,
         frecuencia = excluded.frecuencia, carro = excluded.carro,
         comentario = coalesce(excluded.comentario, public.interesados.comentario), actualizado_en = now();
end;
$$;
revoke execute on function public.registrar_interes(text, text, text, text, text, text[], text, text, text) from public;
grant execute on function public.registrar_interes(text, text, text, text, text, text[], text, text, text) to anon, authenticated;

-- R97: el admin los lee (la más nueva primero)
create function public.admin_interesados(p_ruta text)
returns setof public.interesados language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'Solo el administrador ve los interesados'; end if;
  return query select * from public.interesados where ruta = p_ruta order by actualizado_en desc;
end;
$$;
revoke execute on function public.admin_interesados(text) from anon, public;
grant execute on function public.admin_interesados(text) to authenticated;
