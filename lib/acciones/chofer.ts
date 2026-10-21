"use server"

import { revalidatePath } from "next/cache"

import type { Database } from "@/lib/database.types"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { contrario } from "@/lib/viajes"

// Acciones del chofer. Todas pasan por las funciones RPC (reglas en el servidor); los errores ya vienen en español.
export type Resultado = { ok?: boolean; error?: string; intento?: number }

type EstadoViaje = Database["public"]["Enums"]["estado_viaje"]
type Sentido = Database["public"]["Enums"]["sentido"]

async function rpc(llamada: (s: Awaited<ReturnType<typeof crearClienteServidor>>) => PromiseLike<{ error: { message: string } | null }>): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await llamada(supabase)
  if (error) return { error: error.message }
  revalidatePath("/inicio")
  return { ok: true }
}

export async function conectarme() {
  return rpc((s) => s.rpc("conectar"))
}

/**
 * Desconectarse cancela los viajes publicados (R8) y dice si vuelve hoy (R60): en unos minutos, a una hora ("HH:MM",
 * en Caracas) o null = terminó por hoy.
 */
export async function desconectarme(vuelta: { minutos: number } | { hora: string } | null): Promise<Resultado> {
  let vuelveEn: Date | null = null
  if (vuelta && "minutos" in vuelta) {
    if (!Number.isInteger(vuelta.minutos) || vuelta.minutos < 5 || vuelta.minutos > 720) return { error: "Escoge en cuánto vuelves." }
    vuelveEn = new Date(Date.now() + vuelta.minutos * 60_000)
  } else if (vuelta) {
    vuelveEn = horaDeCaracas(vuelta.hora)
    if (!vuelveEn) return { error: "Escribe la hora en que vuelves." }
  }
  return rpc((s) => s.rpc("desconectar", vuelveEn ? { p_vuelve_en: vuelveEn.toISOString() } : {}))
}

// "14:30" en Caracas (UTC-4, sin horario de verano) → instante. Si esa hora ya pasó hoy, es la de mañana (R10).
function horaDeCaracas(hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null
  const ahoraCaracas = new Date(Date.now() - 4 * 3_600_000)
  const hoy = Date.UTC(ahoraCaracas.getUTCFullYear(), ahoraCaracas.getUTCMonth(), ahoraCaracas.getUTCDate())
  let instante = hoy + (Number(m[1]) + 4) * 3_600_000 + Number(m[2]) * 60_000
  if (instante <= Date.now()) instante += 24 * 3_600_000
  return new Date(instante)
}

/**
 * Publicar viaje (R10) o agregar otro a la cadena (R11): sentido, puestos y cuándo llega a recoger,
 * en minutos ("minutos") o a una hora fija ("hora", HH:MM). La base decide si queda en camino o como próximo.
 * Con "vuelta" (minutos después de salir, R61) publica también la vuelta: sentido contrario y mismos puestos, que
 * queda encadenada detrás de la ida.
 */
export async function publicarViaje(fd: FormData): Promise<Resultado> {
  const vuelta = String(fd.get("vuelta") ?? "")
  const minutosVuelta = Number(vuelta)
  if (vuelta && (!Number.isInteger(minutosVuelta) || minutosVuelta < 1 || minutosVuelta > 240)) {
    return { error: "Escoge cuánto tardas en llegar a recoger para la vuelta." }
  }
  const ida = await publicarIda(fd)
  if (!ida.ok || !vuelta) return ida
  const sentido = String(fd.get("sentido")) as Sentido
  const vueltaRes = await rpc((s) =>
    s.rpc("publicar_viaje", { p_sentido: contrario(sentido), p_puestos: Number(fd.get("puestos")), p_eta_min: minutosVuelta })
  )
  // La ida ya quedó publicada: se dice para que agregue la vuelta a mano
  return vueltaRes.ok ? vueltaRes : { error: `Tu viaje quedó publicado, pero la vuelta no: ${vueltaRes.error} Agrégala con "Agregar otro viaje".` }
}

/** La vuelta al salir (R61): sentido contrario, mismos puestos; con un viaje en ruta queda en camino ya */
export async function publicarVuelta(sentidoIda: Sentido, puestos: number, minutos: number): Promise<Resultado> {
  if (!Number.isInteger(minutos) || minutos < 1 || minutos > 240) return { error: "Escoge cuándo llegas a recoger." }
  return rpc((s) => s.rpc("publicar_viaje", { p_sentido: contrario(sentidoIda), p_puestos: puestos, p_eta_min: minutos }))
}

async function publicarIda(fd: FormData): Promise<Resultado> {
  const sentido = String(fd.get("sentido") ?? "")
  const puestos = Number(fd.get("puestos"))
  const hora = String(fd.get("hora") ?? "")
  if (sentido !== "vg_a_centro" && sentido !== "centro_a_vg") return { error: "Escoge hacia dónde vas." }
  if (!Number.isInteger(puestos) || puestos < 1 || puestos > 8) return { error: "Los puestos deben estar entre 1 y 8." }

  if (hora) {
    const instante = horaDeCaracas(hora)
    if (!instante) return { error: "Escribe la hora completa, por ejemplo 2:30 p. m." }
    return rpc((s) => s.rpc("publicar_viaje", { p_sentido: sentido, p_puestos: puestos, p_hora_fija: instante.toISOString() }))
  }
  const minutos = Number(fd.get("minutos"))
  if (String(fd.get("minutos") ?? "") === "" || !Number.isInteger(minutos) || minutos < 0 || minutos > 240) {
    return { error: "Escribe en cuántos minutos llegas (de 0 a 240)." }
  }
  return rpc((s) => s.rpc("publicar_viaje", { p_sentido: sentido, p_puestos: puestos, p_eta_min: minutos }))
}

/** Avisar que llego / Ya llegué / Salir / Terminar (R12–R14) */
export async function avanzarViaje(viajeId: string, estado: EstadoViaje) {
  return rpc((s) => s.rpc("avanzar_viaje", { p_viaje: viajeId, p_estado: estado }))
}

export async function cancelarViaje(viajeId: string) {
  return rpc((s) => s.rpc("cancelar_viaje", { p_viaje: viajeId }))
}

export async function cambiarPuestos(viajeId: string, puestos: number) {
  return rpc((s) => s.rpc("cambiar_puestos", { p_viaje: viajeId, p_puestos: puestos }))
}

/** Lista de Gina: "Subió" en Gina o en el camino (R64, R67) */
export async function subioDeLista(entradaId: string, viajeId: string) {
  return rpc((s) => s.rpc("subio_de_lista", { p_entrada: entradaId, p_viaje: viajeId }))
}

/** Lista de Gina: "No estaba" (R65) */
export async function noEstabaEnLista(entradaId: string) {
  return rpc((s) => s.rpc("no_estaba_en_lista", { p_entrada: entradaId }))
}

/** "No vino" (R21, R29) */
export async function marcarNoVino(reservaId: string) {
  return rpc((s) => s.rpc("marcar_no_vino", { p_reserva: reservaId }))
}

/** "➕ Ocupar puesto" para quien no usa la app (R36–R37) */
export async function ocuparPuesto(viajeId: string, nombre: string) {
  return rpc((s) => s.rpc("ocupar_puesto", { p_viaje: viajeId, p_nombre: nombre.trim() || undefined }))
}

export async function quitarAnotado(reservaId: string) {
  return rpc((s) => s.rpc("quitar_anotado", { p_reserva: reservaId }))
}

/** Pedido en el camino: ✓ Voy / ✕ Sigo (R29) */
export async function responderPedido(reservaId: string, acepta: boolean) {
  return rpc((s) => s.rpc("responder_pedido", { p_reserva: reservaId, p_acepta: acepta }))
}

export async function marcarSubio(reservaId: string) {
  return rpc((s) => s.rpc("marcar_subio", { p_reserva: reservaId }))
}

/** Se bajó antes del destino: libera el puesto (R38) */
export async function marcarSeBajo(reservaId: string) {
  return rpc((s) => s.rpc("marcar_se_bajo", { p_reserva: reservaId }))
}

/**
 * Guarda la posición del chofer (R40). La hora la pone el servidor (trigger). Va directo a la tabla, con RLS
 * (cada chofer escribe solo la suya). No refresca pantallas: el mapa abierto la recibe por Realtime (R41).
 */
export async function guardarPosicion(lat: number, lng: number, precision: number | null): Promise<Resultado> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { error: "Ubicación inválida" }
  }
  const supabase = await crearClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const yo = data?.claims?.sub
  if (!yo) return { error: "Tu sesión terminó. Vuelve a entrar." }
  const fila = { lat, lng, precision_m: precision === null ? null : Math.round(precision) }
  // Actualizar y, si todavía no tenía fila, crearla (el permiso de update no incluye chofer_id: no sirve upsert)
  const { data: actualizadas, error } = await supabase.from("posiciones").update(fila).eq("chofer_id", yo).select("chofer_id")
  if (error) return { error: error.message }
  if (!actualizadas?.length) {
    const { error: errorNueva } = await supabase.from("posiciones").insert({ chofer_id: yo, ...fila })
    if (errorNueva) return { error: errorNueva.message }
  }
  return { ok: true }
}
