-- =====================================================================================
-- Datos iniciales para desarrollo local (npm run db:reset): SOLO la cuenta de administración, para aprobar
-- las cuentas reales que se registren desde la app. Usuario "admin", contraseña "admin123" (el panel obliga a
-- cambiarla al entrar). En producción el admin se crea con npm run admin:crear.
-- Datos de ejemplo (choferes, pasajeros, viajes): npm run db:demo (supabase/demo.sql).
-- =====================================================================================

select public.crear_admin('admin', 'admin123', '00000000-0000-4000-a000-000000000001');
