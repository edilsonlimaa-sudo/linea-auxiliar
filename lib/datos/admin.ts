// Datos del panel del admin (docs/especificacion.md §8, "Panel del admin")
import type { Database } from "@/lib/database.types"
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { aceptaReservas, ACTIVOS, libres, type Sentido } from "@/lib/viajes"

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

export type Esperando = Funciones["admin_demanda"]["Returns"][number] & { fotoUrl: string | null; minutos: number }
export type DemandaHoy = Funciones["admin_demanda_hoy"]["Returns"][number]
export type OfertaSentido = { unidades: number; puestosLibres: number }

/** Demanda del panel (§8): quién espera, la oferta por sentido y cómo se atendió hoy */
export async function cargarDemanda(): Promise<{
  esperando: Esperando[]
  oferta: Record<Sentido, OfertaSentido>
  hoy: DemandaHoy | null
  error: string | null
}> {
  const supabase = await crearClienteServidor()
  const [esperandoRes, hoyRes, viajesRes] = await Promise.all([
    supabase.rpc("admin_demanda"),
    supabase.rpc("admin_demanda_hoy"),
    supabase.from("viajes").select("*").in("estado", ACTIVOS),
  ])
  const filas = esperandoRes.data ?? []
  const fotos = await firmarFotos(filas.map((e) => e.foto_path))

  // Unidades que aceptan pasajeros y tienen puesto libre, igual que la oferta que ven los choferes
  const oferta: Record<Sentido, OfertaSentido> = { vg_a_centro: { unidades: 0, puestosLibres: 0 }, centro_a_vg: { unidades: 0, puestosLibres: 0 } }
  for (const v of viajesRes.data ?? []) {
    if (!aceptaReservas(v) || libres(v) === 0) continue
    oferta[v.sentido].unidades += 1
    oferta[v.sentido].puestosLibres += libres(v)
  }

  const ahora = Date.now()
  return {
    esperando: filas.map((e) => ({
      ...e,
      fotoUrl: e.foto_path ? (fotos.get(e.foto_path) ?? null) : null,
      minutos: (ahora - new Date(e.creado_en).getTime()) / 60_000,
    })),
    oferta,
    hoy: hoyRes.data?.[0] ?? null,
    error: esperandoRes.error?.message ?? null,
  }
}
