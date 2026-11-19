import "server-only"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

// Mis números del chofer en la interfaz nueva (R118): los mismos de la app nativa (R111), de `tablero_chofer(mes)` y
// `tablero_chofer_rango(desde, hasta)`. Las formas son las de linea-apps/packages/comun/src/tablero-chofer.ts

export type TableroMes = {
  hoy: { viajes: number; pasajeros: number; abiertos: number }
  primer_mes: string // AAAA-MM-01
  mes: {
    desde: string
    hasta: string
    actual: boolean
    viajes: number
    pasajeros: number
    viajes_antes: number
    pasajeros_antes: number
    dias: { dia: string; pasajeros: number; pasajes: number }[]
  }
  cobrado: { pasajes: number; gratis: number; cuotas: number }
}

export type TableroRango = {
  desde: string
  hasta: string
  viajes: number
  pasajeros: number
  viajes_antes: number
  pasajeros_antes: number
  cobrado: { pasajes: number; gratis: number; cuotas: number }
  antes_a_esta_hora: { pasajes: number; pasajeros: number } | null
  mismo_dia: { dias: number; pasajes: number; pasajeros: number } | null
  dias: { dia: string; viajes: number; pasajeros: number; pasajes: number }[]
  lista: { id: string; sentido: "vg_a_centro" | "centro_a_vg"; puestos: number; salida_en: string | null; llegada_en: string | null; personas: number; pasajes: number }[]
}

export type Periodo = "hoy" | "semana" | "mes"

/** Hoy en Caracas, AAAA-MM-DD (el mismo de la cuota) */
export { diaDeHoy as hoyCaracas } from "@/lib/fechas"

/** "2026-11-14" + n días (fechas de calendario) */
export function otroDia(dia: string, n: number) {
  const d = new Date(`${dia}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** El lunes de la semana de ese día */
export const lunesDe = (dia: string) => otroDia(dia, -((new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7))

/** "2026-10-01": el mes de antes (-1) o de después (1) */
export function otroMes(mes: string, paso: number) {
  const d = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1 + paso, 1, 12))
  return d.toISOString().slice(0, 8) + "01"
}

export async function cargarMes(mes: string): Promise<TableroMes | null> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("tablero_chofer", { p_mes: mes })
  return error || !data ? null : (data as unknown as TableroMes)
}

export async function cargarRango(desde: string, hasta: string): Promise<TableroRango | null> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("tablero_chofer_rango", { p_desde: desde, p_hasta: hasta })
  return error || !data ? null : (data as unknown as TableroRango)
}
