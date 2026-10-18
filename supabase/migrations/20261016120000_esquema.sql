-- =====================================================================================
-- Línea Auxiliar Valle Grande — esquema base
-- Reglas de negocio: docs/especificacion.md (R1–R51).
-- Las escrituras sensibles NO se hacen directo a las tablas: van por funciones
-- (migración "reglas"), y la lectura está limitada por RLS (migración "seguridad").
-- =====================================================================================

-- ---------- Tipos ----------
create type public.rol_usuario as enum ('pasajero', 'chofer', 'admin');
create type public.estado_cuenta as enum ('pendiente', 'aprobado', 'rechazado');
create type public.sentido as enum ('vg_a_centro', 'centro_a_vg');
create type public.estado_viaje as enum (
  'programado',  -- próximo viaje de la cadena: arranca solo al salir del anterior (R11–R12)
  'en_camino',
  'llegando',
  'en_parada',
  'en_ruta',
  'finalizado',
  'cancelado'
);
create type public.estado_reserva as enum (
  'activa',      -- tiene puesto o turno; en ruta: pedido en el camino (pendiente o aceptado)
  'subio',
  'bajo',        -- se bajó antes del destino
  'no_llego',
  'cancelada',
  'sin_puesto',  -- el carro salió lleno o se canceló: debe escoger otra unidad (R14, R24)
  'rechazada'    -- pedido en el camino que el chofer no tomó (R29–R30)
);
create type public.estado_espera as enum ('esperando', 'reservo', 'cancelada', 'expirada');
create type public.tipo_alerta as enum ('caucho', 'gasolina', 'accidente', 'mecanica');
create type public.estado_alerta as enum ('activa', 'resuelta');

-- ---------- Utilidades puras ----------

-- Teléfono venezolano a formato internacional: 0414-1234567 → +584141234567 (R3)
create function public.normalizar_telefono(p_telefono text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d ~ '^0\d{10}$'  then '+58' || substr(d, 2)
    when d ~ '^58\d{10}$' then '+' || d
    when d ~ '^\d{10}$'   then '+58' || d
    else '+' || d
  end
  from (select regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g') as d) t;
$$;

-- El login usa un correo interno derivado del teléfono (el PIN es la contraseña). Nunca se muestra.
create function public.correo_de_telefono(p_telefono text)
returns text
language sql
immutable
set search_path = ''
as $$
  select substr(public.normalizar_telefono(p_telefono), 2) || '@tel.lineaauxiliar.app';
$$;

-- "Carmen Rivas" → "Carmen R." (listas públicas, R19). Sin nombre devuelve null (no ''), para que
-- coalesce(nombre_corto(...), otro) funcione con los anotados a mano.
create function public.nombre_corto(p_nombre text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when trim(coalesce(p_nombre, '')) = '' then null
    when array_length(partes, 1) > 1 then partes[1] || ' ' || left(partes[2], 1) || '.'
    else partes[1]
  end
  from (select regexp_split_to_array(trim(coalesce(p_nombre, '')), '\s+') as partes) t;
$$;

-- ---------- Tablas ----------

-- Datos visibles para cualquier usuario con sesión (nombre, foto, rol, verificado)
create table public.perfiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  rol           public.rol_usuario not null,
  nombre        text not null check (char_length(trim(nombre)) between 2 and 60),
  urbanismo     text check (char_length(urbanismo) <= 60),
  foto_path     text,
  estado        public.estado_cuenta not null default 'pendiente',
  aprobado_por  uuid references public.perfiles (id),
  aprobado_en   timestamptz,
  conectado_en  timestamptz,  -- choferes: null = desconectado (R6–R9)
  creado_en     timestamptz not null default now()
);
comment on table public.perfiles is 'Datos públicos de cada cuenta. Teléfono y cédula viven en perfiles_privados.';

-- Datos sensibles: teléfono (visible según la tabla "quién ve qué") y cédula (solo la persona y el admin)
create table public.perfiles_privados (
  id        uuid primary key references public.perfiles (id) on delete cascade,
  telefono  text not null unique check (telefono ~ '^\+\d{8,15}$'),
  cedula    text check (char_length(cedula) <= 20)
);

create table public.vehiculos (
  id         uuid primary key default gen_random_uuid(),
  chofer_id  uuid not null unique references public.perfiles (id) on delete cascade,
  unidad     text check (char_length(unidad) <= 10),
  placa      text not null unique check (placa ~ '^[A-Z0-9]{5,8}$'),
  modelo     text check (char_length(modelo) <= 40),
  color      text check (char_length(color) <= 30),
  foto_path  text
);


create table public.viajes (
  id           uuid primary key default gen_random_uuid(),
  chofer_id    uuid not null references public.perfiles (id),
  sentido      public.sentido not null,
  puestos      int not null check (puestos between 1 and 8),
  eta_min      int not null default 0 check (eta_min between 0 and 1440),  -- llega en X min (o trayecto si es programado)
  hora_fija    timestamptz,                                                -- "llego a las 14:00" (mínimo del estimado)
  estado       public.estado_viaje not null,
  despues_de   uuid references public.viajes (id),                         -- viaje anterior de la cadena
  ocupados     int not null default 0,                                     -- reservas activa/subio (lo mantiene un trigger)
  estado_en    timestamptz not null default now(),
  salida_en    timestamptz,
  llegada_en   timestamptz,
  creado_en    timestamptz not null default now()
);
create index viajes_por_chofer on public.viajes (chofer_id, estado);
create index viajes_abiertos on public.viajes (estado) where estado not in ('finalizado', 'cancelado');

-- El puesto NO se guarda: es la posición por creado_en entre las reservas activa/subio (R17).
-- creado_en usa clock_timestamp(): hora del servidor, distinta incluso dentro de una misma transacción.
create table public.reservas (
  id                    uuid primary key default gen_random_uuid(),
  viaje_id              uuid not null references public.viajes (id) on delete cascade,
  pasajero_id           uuid references public.perfiles (id),   -- null: anotado a mano por el chofer
  nombre                text check (char_length(nombre) <= 40), -- solo anotados a mano
  estado                public.estado_reserva not null default 'activa',
  lugar                 text check (char_length(lugar) <= 60),  -- dónde recogerlo, texto libre (R25). Sin paradas registradas
  lat                   double precision,
  lng                   double precision,
  listo                 boolean not null default false,         -- "✋ Ya estoy en el sitio"
  en_camino             boolean not null default false,         -- subió/pidió con el carro ya en ruta
  pendiente             boolean not null default false,         -- pedido en el camino sin respuesta del chofer
  aceptada_en           timestamptz,
  agregada_por          uuid references public.perfiles (id),   -- el chofer lo agregó desde "Esperando"
  calificacion_omitida  boolean not null default false,
  creado_en             timestamptz not null default clock_timestamp(),
  cerrada_en            timestamptz,
  constraint reserva_tiene_quien check (pasajero_id is not null or nombre is not null),
  constraint reserva_coordenadas check ((lat is null) = (lng is null))
);
create index reservas_por_viaje on public.reservas (viaje_id, estado, creado_en);
create index reservas_por_pasajero on public.reservas (pasajero_id, estado);
-- Un pasajero tiene a lo sumo un lugar activo a la vez (R18)
create unique index una_reserva_activa on public.reservas (pasajero_id)
  where estado = 'activa' and pasajero_id is not null;

create table public.esperas (
  id               uuid primary key default gen_random_uuid(),
  pasajero_id      uuid not null references public.perfiles (id),
  sentido          public.sentido not null,                -- hacia dónde va: agrupa la demanda (R31)
  lugar            text check (char_length(lugar) <= 60),
  lat              double precision,
  lng              double precision,
  estado           public.estado_espera not null default 'esperando',
  creado_en        timestamptz not null default clock_timestamp(),
  cerrada_en       timestamptz,
  constraint espera_donde check (lugar is not null or lat is not null),
  constraint espera_coordenadas check ((lat is null) = (lng is null))
);
create unique index una_espera_activa on public.esperas (pasajero_id) where estado = 'esperando';

-- Última posición de cada chofer (mapa en vivo, R40–R42)
create table public.posiciones (
  chofer_id       uuid primary key references public.perfiles (id) on delete cascade,
  lat             double precision not null,
  lng             double precision not null,
  precision_m     int,
  actualizada_en  timestamptz not null default now()
);

create table public.alertas (
  id           uuid primary key default gen_random_uuid(),
  chofer_id    uuid not null references public.perfiles (id),
  tipo         public.tipo_alerta not null,
  lat          double precision,
  lng          double precision,
  estado       public.estado_alerta not null default 'activa',
  creado_en    timestamptz not null default now(),
  resuelta_en  timestamptz
);
create unique index una_alerta_activa on public.alertas (chofer_id) where estado = 'activa';

create table public.alerta_apoyos (
  alerta_id  uuid references public.alertas (id) on delete cascade,
  chofer_id  uuid references public.perfiles (id),
  creado_en  timestamptz not null default now(),
  primary key (alerta_id, chofer_id)
);

create table public.calificaciones (
  id           uuid primary key default gen_random_uuid(),
  viaje_id     uuid not null references public.viajes (id),
  chofer_id    uuid not null references public.perfiles (id),
  pasajero_id  uuid not null references public.perfiles (id),
  estrellas    int not null check (estrellas between 1 and 5),
  etiquetas    text[] not null default '{}'
               check (etiquetas <@ array['Puntual', 'Seguro', 'Amable', 'Respetó el orden', 'Carro limpio']),
  comentario   text check (char_length(comentario) <= 140),
  creado_en    timestamptz not null default now(),
  unique (viaje_id, pasajero_id)
);

-- Aviso oficial del día (R47)
create table public.avisos (
  id         uuid primary key default gen_random_uuid(),
  texto      text not null check (char_length(trim(texto)) between 1 and 240),
  autor_id   uuid not null default auth.uid() references public.perfiles (id),
  creado_en  timestamptz not null default now()
);

-- ---------- Triggers ----------

-- Mantiene viajes.ocupados. De paso, cada cambio en la lista toca la fila del viaje: los pasajeros que
-- no pueden leer las reservas de otros reciben ese cambio por Realtime y vuelven a pedir la lista pública.
create function public.actualizar_ocupados()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_viaje uuid := coalesce(new.viaje_id, old.viaje_id);
begin
  update public.viajes
     set ocupados = (select count(*) from public.reservas r
                      where r.viaje_id = v_viaje and r.estado in ('activa', 'subio'))
   where id = v_viaje;
  return null;
end;
$$;

create trigger reservas_ocupados
after insert or update of estado or delete on public.reservas
for each row execute function public.actualizar_ocupados();

-- Placa siempre en mayúsculas y sin espacios ni guiones
create function public.normalizar_placa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.placa := upper(regexp_replace(new.placa, '[^A-Za-z0-9]', '', 'g'));
  return new;
end;
$$;

create trigger vehiculos_placa
before insert or update of placa on public.vehiculos
for each row execute function public.normalizar_placa();

-- La hora de la posición la pone el servidor, no el teléfono
create function public.hora_servidor_posicion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizada_en := now();
  return new;
end;
$$;

create trigger posiciones_hora
before insert or update on public.posiciones
for each row execute function public.hora_servidor_posicion();

-- Al registrarse (auth.signUp) se crean perfil, datos privados y vehículo con los metadatos del formulario.
-- Valida el rol y que el correo interno corresponda al teléfono (así nadie registra el teléfono de otro).
create function public.crear_perfil_nuevo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_rol    public.rol_usuario;
  v_tel    text := public.normalizar_telefono(m ->> 'telefono');
begin
  if coalesce(m ->> 'rol', '') not in ('pasajero', 'chofer') then
    raise exception 'Rol inválido: debe ser pasajero o chofer';
  end if;
  v_rol := (m ->> 'rol')::public.rol_usuario;

  if new.email is distinct from public.correo_de_telefono(m ->> 'telefono') then
    raise exception 'El correo interno no corresponde al teléfono';
  end if;

  insert into public.perfiles (id, rol, nombre, urbanismo)
  values (new.id, v_rol, trim(m ->> 'nombre'), nullif(trim(m ->> 'urbanismo'), ''));

  insert into public.perfiles_privados (id, telefono, cedula)
  values (new.id, v_tel, nullif(trim(m ->> 'cedula'), ''));

  if v_rol = 'chofer' then
    if coalesce(trim(m ->> 'placa'), '') = '' then
      raise exception 'La placa es obligatoria para choferes';
    end if;
    insert into public.vehiculos (chofer_id, unidad, placa, modelo, color)
    values (new.id, nullif(trim(m ->> 'unidad'), ''), m ->> 'placa',
            nullif(trim(m ->> 'modelo'), ''), nullif(trim(m ->> 'color'), ''));
  end if;

  return new;
end;
$$;

create trigger al_registrarse
after insert on auth.users
for each row execute function public.crear_perfil_nuevo();
