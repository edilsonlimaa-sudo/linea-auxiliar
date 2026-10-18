-- =====================================================================================
-- Seguridad: RLS y permisos. Tabla "quién ve qué" en docs/especificacion.md §6.
-- Principios:
--   1. Sin sesión no se ve nada (anon no tiene acceso a las tablas).
--   2. Viajes, reservas, esperas y alertas NO se escriben directo: solo con las funciones de
--      la migración "reglas" (security definer), que validan cada regla.
--   3. Permisos por columna: lo que no se concede explícitamente no se puede leer/escribir.
-- =====================================================================================

-- ---------- Ayudantes (security definer: consultan perfiles sin pasar por RLS) ----------

create function public.es_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles
                  where id = auth.uid() and rol = 'admin' and estado = 'aprobado');
$$;

create function public.es_aprobado()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and estado = 'aprobado');
$$;

create function public.es_chofer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfiles
                  where id = auth.uid() and rol = 'chofer' and estado = 'aprobado');
$$;

-- ¿Puede quien consulta ver el teléfono de p_objetivo? (§6)
create function public.puede_ver_telefono(p_objetivo uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    auth.uid() = p_objetivo
    or public.es_admin()
    -- El teléfono de un chofer: lo ven los demás choferes y los pasajeros con reserva en sus viajes abiertos
    or (exists (select 1 from public.perfiles o where o.id = p_objetivo and o.rol = 'chofer')
        and (public.es_chofer()
             or exists (select 1 from public.reservas r join public.viajes v on v.id = r.viaje_id
                         where v.chofer_id = p_objetivo and r.pasajero_id = auth.uid()
                           and r.estado in ('activa', 'subio')
                           and v.estado not in ('finalizado', 'cancelado'))))
    -- El teléfono de un pasajero: solo su chofer (viaje abierto o de los últimos 7 días). Esperar no lo expone (R31).
    or (public.es_chofer()
        and exists (select 1 from public.reservas r join public.viajes v on v.id = r.viaje_id
                     where r.pasajero_id = p_objetivo and v.chofer_id = auth.uid()
                       and r.estado in ('activa', 'subio', 'bajo')
                       and (v.estado not in ('finalizado', 'cancelado') or v.llegada_en > now() - interval '7 days')));
$$;

-- ---------- Base: anon sin acceso; authenticated solo lo que se concede abajo ----------
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;

-- ---------- perfiles ----------
alter table public.perfiles enable row level security;

create policy "perfiles: leer con sesión" on public.perfiles
  for select to authenticated using (true);

-- Cada uno edita solo su nombre, urbanismo y foto (rol, estado y conexión van por funciones)
revoke update on public.perfiles from authenticated;
grant update (nombre, urbanismo, foto_path) on public.perfiles to authenticated;
create policy "perfiles: editar el propio" on public.perfiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- perfiles_privados ----------
alter table public.perfiles_privados enable row level security;

-- La cédula no se concede: solo la leen la persona y el admin con funciones (mis_datos_privados, admin_datos_privados)
revoke select on public.perfiles_privados from authenticated;
grant select (id, telefono) on public.perfiles_privados to authenticated;
create policy "privados: teléfono según relación" on public.perfiles_privados
  for select to authenticated using (public.puede_ver_telefono(id));

grant update (cedula) on public.perfiles_privados to authenticated;
create policy "privados: editar la propia cédula" on public.perfiles_privados
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- vehiculos ----------
alter table public.vehiculos enable row level security;

create policy "vehiculos: leer con sesión" on public.vehiculos
  for select to authenticated using (true);

grant update (unidad, placa, modelo, color, foto_path) on public.vehiculos to authenticated;
create policy "vehiculos: editar el propio" on public.vehiculos
  for update to authenticated using (chofer_id = auth.uid()) with check (chofer_id = auth.uid());

-- ---------- viajes (escritura solo por funciones) ----------
alter table public.viajes enable row level security;
create policy "viajes: leer con sesión" on public.viajes
  for select to authenticated using (true);

-- ---------- reservas ----------
-- Cada pasajero ve las suyas; el chofer, las de sus viajes; el admin, todas.
-- La lista pública (nombre corto y posición) se obtiene con lista_viaje(), sin ubicación ni teléfono.
alter table public.reservas enable row level security;
create policy "reservas: propias, de mis viajes o admin" on public.reservas
  for select to authenticated using (
    pasajero_id = auth.uid()
    or exists (select 1 from public.viajes v where v.id = viaje_id and v.chofer_id = auth.uid())
    or public.es_admin()
  );

-- ---------- esperas ----------
alter table public.esperas enable row level security;
-- Solo la propia y el admin: los choferes ven cuántos esperan con demanda_por_sentido() (R31, §6)
create policy "esperas: propia o admin" on public.esperas
  for select to authenticated using (pasajero_id = auth.uid() or public.es_admin());

-- ---------- posiciones ----------
-- Visibles solo mientras el chofer está conectado (R41). Cada chofer escribe la suya.
alter table public.posiciones enable row level security;
create policy "posiciones: choferes conectados" on public.posiciones
  for select to authenticated using (
    exists (select 1 from public.perfiles p where p.id = chofer_id and p.conectado_en is not null)
  );

grant insert (chofer_id, lat, lng, precision_m), update (lat, lng, precision_m) on public.posiciones to authenticated;
create policy "posiciones: el chofer escribe la suya" on public.posiciones
  for insert to authenticated with check (chofer_id = auth.uid() and public.es_chofer());
create policy "posiciones: el chofer actualiza la suya" on public.posiciones
  for update to authenticated using (chofer_id = auth.uid()) with check (chofer_id = auth.uid() and public.es_chofer());

-- ---------- alertas de auxilio (solo choferes y admin) ----------
alter table public.alertas enable row level security;
create policy "alertas: choferes y admin" on public.alertas
  for select to authenticated using (public.es_chofer() or public.es_admin());

alter table public.alerta_apoyos enable row level security;
create policy "apoyos: choferes y admin" on public.alerta_apoyos
  for select to authenticated using (public.es_chofer() or public.es_admin());

-- ---------- calificaciones ----------
-- Públicas (★ y comentarios en la tarjeta del chofer). Solo califica quien viajó de verdad (R44).
alter table public.calificaciones enable row level security;
create policy "calificaciones: leer con sesión" on public.calificaciones
  for select to authenticated using (true);

grant insert (viaje_id, chofer_id, pasajero_id, estrellas, etiquetas, comentario) on public.calificaciones to authenticated;
create policy "calificaciones: solo quien viajó" on public.calificaciones
  for insert to authenticated with check (
    pasajero_id = auth.uid()
    and exists (select 1 from public.reservas r join public.viajes v on v.id = r.viaje_id
                 where r.viaje_id = calificaciones.viaje_id and r.pasajero_id = auth.uid()
                   and r.estado in ('subio', 'bajo') and v.chofer_id = calificaciones.chofer_id)
  );

grant update (estrellas, etiquetas, comentario) on public.calificaciones to authenticated;
create policy "calificaciones: editar la propia" on public.calificaciones
  for update to authenticated using (pasajero_id = auth.uid()) with check (pasajero_id = auth.uid());

-- ---------- avisos (los publica el admin) ----------
alter table public.avisos enable row level security;
create policy "avisos: leer con sesión" on public.avisos
  for select to authenticated using (true);

grant insert (texto) on public.avisos to authenticated;
create policy "avisos: publica el admin" on public.avisos
  for insert to authenticated with check (public.es_admin() and autor_id = auth.uid());

-- ---------- Funciones: nadie sin sesión ejecuta funciones del esquema ----------
revoke execute on all functions in schema public from anon, public;
grant execute on all functions in schema public to authenticated;
-- Las de uso interno de triggers no deben llamarse desde la API
revoke execute on function public.actualizar_ocupados(), public.normalizar_placa(),
  public.hora_servidor_posicion(), public.crear_perfil_nuevo() from authenticated;

-- ---------- Realtime: tablas cuyos cambios se transmiten (siempre filtrados por RLS) ----------
alter publication supabase_realtime add table
  public.perfiles, public.viajes, public.reservas, public.esperas,
  public.posiciones, public.alertas, public.alerta_apoyos, public.avisos;
