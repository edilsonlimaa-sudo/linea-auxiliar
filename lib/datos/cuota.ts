// Cuota del día (docs/especificacion.md §5.18, R76–R78): lo que ve el chofer y lo que revisa el admin
import type { DatosPagoMovil } from "@/lib/bancos"
import { diaDeHoy } from "@/lib/fechas"
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export type EstadoAviso = "revision" | "aprobado" | "rechazado"
const esEstado = (e: string): e is EstadoAviso => e === "revision" || e === "aprobado" || e === "rechazado"

export type AvisoCuota = {
  id: string
  referencia: string
  banco: string
  monto: number
  estado: EstadoAviso
  habilita: boolean // el primero del día: libera mientras está en revisión (R77)
  motivo: string | null
  creadoEn: string
}

export type CuotaChofer = {
  monto: number
  pagoMovil: DatosPagoMovil | null // el de la línea
  habilitado: boolean
  avisos: AvisoCuota[] // los de hoy, el último primero
}

const aAviso = (a: { id: string; referencia: string; banco: string; monto: number; estado: string; habilita: boolean; motivo: string | null; creado_en: string }): AvisoCuota => ({
  id: a.id,
  referencia: a.referencia,
  banco: a.banco,
  monto: a.monto,
  estado: esEstado(a.estado) ? a.estado : "revision",
  habilita: a.habilita,
  motivo: a.motivo,
  creadoEn: a.creado_en,
})

/** La cuota de hoy para el chofer (R76–R77). Sin cuota vigente, null: todo funciona como antes */
export async function cargarCuotaChofer(choferId: string): Promise<CuotaChofer | null> {
  const supabase = await crearClienteServidor()
  const [cuotaRes, avisosRes] = await Promise.all([
    supabase.rpc("cuota_de_hoy"),
    supabase
      .from("cuota_pagos")
      .select("id, referencia, banco, monto, estado, habilita, motivo, creado_en")
      .eq("chofer_id", choferId)
      .eq("dia", diaDeHoy())
      .order("creado_en", { ascending: false }),
  ])
  const c = cuotaRes.data?.[0]
  if (!c?.rige) return null
  return {
    monto: c.monto,
    pagoMovil: c.banco && c.telefono && c.cedula ? { banco: c.banco, telefono: c.telefono, cedula: c.cedula } : null,
    habilitado: c.habilitado,
    avisos: (avisosRes.data ?? []).map(aAviso),
  }
}

export type ConfigCuota = { activa: boolean; desde: string; monto: number; banco: string | null; telefono: string | null; cedula: string | null }
export type AvisoAdmin = AvisoCuota & { choferId: string; chofer: string; fotoUrl: string | null; decididoEn: string | null }

/** Panel "Cuotas" (R78): los datos del cobro y los avisos de un día, en revisión primero */
export async function cargarCuotasAdmin(dia: string): Promise<{ config: ConfigCuota | null; avisos: AvisoAdmin[] }> {
  const supabase = await crearClienteServidor()
  const [configRes, avisosRes] = await Promise.all([
    supabase.from("cuota_config").select("activa, desde, monto, banco, telefono, cedula").maybeSingle(),
    supabase
      .from("cuota_pagos")
      .select("id, chofer_id, referencia, banco, monto, estado, habilita, motivo, creado_en, decidido_en, chofer:perfiles!cuota_pagos_chofer_id_fkey(nombre, foto_path)")
      .eq("dia", dia)
      .order("creado_en", { ascending: true }),
  ])
  const filas = avisosRes.data ?? []
  const fotos = await firmarFotos(filas.map((a) => a.chofer?.foto_path))
  const orden: Record<EstadoAviso, number> = { revision: 0, rechazado: 1, aprobado: 2 }
  const avisos = filas
    .map((a) => ({
      ...aAviso(a),
      choferId: a.chofer_id,
      chofer: a.chofer?.nombre ?? "Chofer",
      fotoUrl: a.chofer?.foto_path ? (fotos.get(a.chofer.foto_path) ?? null) : null,
      decididoEn: a.decidido_en,
    }))
    .sort((a, b) => orden[a.estado] - orden[b.estado] || a.creadoEn.localeCompare(b.creadoEn))
  return { config: configRes.data, avisos }
}

/** Cuántos avisos esperan revisión (cualquier día), para el menú del panel */
export async function contarCuotasEnRevision(): Promise<number> {
  const supabase = await crearClienteServidor()
  const { count } = await supabase.from("cuota_pagos").select("id", { count: "exact", head: true }).eq("estado", "revision")
  return count ?? 0
}
