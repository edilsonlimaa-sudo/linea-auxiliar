// Cuenta de administración: entra con usuario + contraseña (no con teléfono + PIN).
// Correo interno: usuario@admin.lineaauxiliar.app (nunca se muestra). Debe coincidir con supabase/seed.sql
// y scripts/crear-admin.mjs.
export function correoDeAdmin(usuario: string): string {
  return `${usuario.trim().toLowerCase()}@admin.lineaauxiliar.app`
}

/** Cookie que marca un aparato donde el admin ya entró: la portada le muestra el enlace al panel (§8) */
export const APARATO_ADMIN = "aparato_admin"
