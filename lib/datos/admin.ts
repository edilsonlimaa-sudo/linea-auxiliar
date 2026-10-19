// Datos del panel del admin (docs/especificacion.md §8, "Panel del admin")
import type { Database } from "@/lib/database.types"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

type Funciones = Database["public"]["Functions"]
export type Cuenta = Funciones["admin_cuentas"]["Returns"][number]
export type Actividad = Omit<Funciones["admin_actividad"]["Returns"][number], "id">
export type CuentaConActividad = Cuenta & { actividad: Actividad | null }
export type Resumen = Funciones["admin_resumen"]["Returns"][number]
export type EstadoCuenta = Database["public"]["Enums"]["estado_cuenta"]
export type RolCuenta = "chofer" | "pasajero"

/** Todas las cuentas (menos admin) con su actividad */
export async function cargarCuentas(): Promise<{ cuentas: CuentaConActividad[]; error: string | null }> {
  const supabase = await crearClienteServidor()
  const [cuentasRes, actividadRes] = await Promise.all([supabase.rpc("admin_cuentas"), supabase.rpc("admin_actividad")])
  const actividad = new Map((actividadRes.data ?? []).map(({ id, ...a }) => [id, a]))
  return {
    cuentas: (cuentasRes.data ?? []).map((c) => ({ ...c, actividad: actividad.get(c.id) ?? null })),
    error: cuentasRes.error?.message ?? null,
  }
}

export async function cargarResumen(): Promise<Resumen | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc("admin_resumen")
  return data?.[0] ?? null
}

/** Pendientes por rol, para las pestañas y "Por revisar" */
export function pendientesPorRol(cuentas: Cuenta[]): Record<RolCuenta, number> {
  const pendientes = cuentas.filter((c) => c.estado === "pendiente")
  return {
    chofer: pendientes.filter((c) => c.rol === "chofer").length,
    pasajero: pendientes.filter((c) => c.rol === "pasajero").length,
  }
}
