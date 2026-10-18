-- =====================================================================================
-- Fotos (perfil y vehículo) y tareas automáticas.
-- =====================================================================================

-- ---------- Storage: bucket privado "fotos" ----------
-- Ruta: <id del usuario>/<archivo>. Cada uno sube y cambia solo lo de su carpeta;
-- cualquier usuario con sesión puede verlas (las fotos ayudan a reconocerse al recoger).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']);

create policy "fotos: ver con sesión" on storage.objects
  for select to authenticated using (bucket_id = 'fotos');

create policy "fotos: subir a mi carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: cambiar en mi carpeta" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "fotos: borrar en mi carpeta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Tareas automáticas (pg_cron, hora UTC) ----------
create extension if not exists pg_cron with schema pg_catalog;

-- Medianoche en America/Caracas (UTC-4, sin horario de verano) = 04:00 UTC (R9)
select cron.schedule('desconectar-choferes-medianoche', '0 4 * * *', $$select public.desconectar_inactivos()$$);

-- Esperas de más de 2 h (R35)
select cron.schedule('vencer-esperas', '*/10 * * * *', $$select public.vencer_esperas()$$);
