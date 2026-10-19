"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

// Resultado de las acciones del pasajero. Los errores de las funciones de la base ya vienen en español.
export type Resultado = { ok?: boolean; error?: string; intento?: number }

const texto = (fd: FormData, campo: string) => {
  const v = String(fd.get(campo) ?? "").trim()
  return v === "" ? undefined : v
}
// Inicio, Mi viaje y el menú (que muestra "Mi viaje" solo con reserva activa) dependen de la reserva
const actualizarApp = () => revalidatePath("/", "layout")

const numero = (fd: FormData, campo: string) => {
  const v = texto(fd, campo)
  return v === undefined ? undefined : Number(v)
}

/**
 * Apartar puesto de un toque (R16–R29, R27): el lugar sale de la espera (el primer paso del pasajero, R31) o,
 * al cambiarse de unidad desde la lista de espera (R22), de su reserva actual. Lo lee el servidor: no se pide otra vez.
 */
export async function apartarPuesto(viajeId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { data: sesion } = await supabase.auth.getClaims()
  const yo = sesion?.claims?.sub
  if (!yo) return { error: "Tu sesión terminó. Vuelve a entrar." }

  const [esperaRes, reservaRes] = await Promise.all([
    supabase.from("esperas").select("lugar, lat, lng").eq("pasajero_id", yo).eq("estado", "esperando").maybeSingle(),
    supabase.from("reservas").select("lugar, lat, lng").eq("pasajero_id", yo).eq("estado", "activa").maybeSingle(),
  ])
  const origen = esperaRes.data ?? reservaRes.data
  if (!origen) return { error: "Primero avisa hacia dónde vas y dónde estás." }

  const { error } = await supabase.rpc("reservar", {
    p_viaje: viajeId,
    p_lugar: origen.lugar ?? undefined,
    p_lat: origen.lat ?? undefined,
    p_lng: origen.lng ?? undefined,
  })
  if (error) return { error: error.message }
  actualizarApp()
  // Apartar es pasar de escoger a acompañar el viaje: se abre su página (docs/especificacion.md §8)
  redirect("/mi-viaje")
}

/** "Ya no voy": libera el puesto y el siguiente sube solo (R20) */
export async function liberarPuesto(reservaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("cancelar_reserva", { p_reserva: reservaId })
  if (error) return { error: error.message }
  actualizarApp()
  redirect("/inicio")
}

/** "✋ Ya estoy en el sitio" (R23) */
export async function avisarQueLlegue(reservaId: string, listo: boolean): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("marcar_listo", { p_reserva: reservaId, p_listo: listo })
  if (error) return { error: error.message }
  revalidatePath("/mi-viaje")
  return { ok: true }
}

/** "Avisar que estoy esperando": el primer paso del pasajero, sentido + lugar (R31). Repetirlo cambia la espera. */
export async function avisarQueEspero(fd: FormData): Promise<Resultado> {
  const sentido = texto(fd, "sentido")
  const lugar = texto(fd, "lugar")
  const lat = numero(fd, "lat")
  const lng = numero(fd, "lng")
  if (sentido !== "vg_a_centro" && sentido !== "centro_a_vg") return { error: "Escoge hacia dónde vas." }
  if (!lugar && lat === undefined) return { error: "Escribe dónde estás o marca tu ubicación GPS." }
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("marcar_espera", { p_sentido: sentido, p_lugar: lugar, p_lat: lat, p_lng: lng })
  if (error) return { error: error.message }
  revalidatePath("/inicio")
  return { ok: true }
}

export async function dejarDeEsperar(): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("cancelar_espera")
  if (error) return { error: error.message }
  revalidatePath("/inicio")
  return { ok: true }
}

const ETIQUETAS = ["Puntual", "Seguro", "Amable", "Respetó el orden", "Carro limpio"]

/** "¿Cómo te fue con…?" (R45). La base solo deja calificar a quien viajó de verdad (R44). */
export async function calificarViaje(anterior: Resultado, fd: FormData): Promise<Resultado> {
  const intento = (anterior.intento ?? 0) + 1
  const estrellas = Number(fd.get("estrellas"))
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return { error: "Toca las estrellas para calificar.", intento }
  const comentario = texto(fd, "comentario")
  if (comentario && comentario.length > 140) return { error: "El comentario es muy largo (máximo 140 letras).", intento }
  const supabase = await crearClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const { error } = await supabase.from("calificaciones").insert({
    viaje_id: String(fd.get("viaje")),
    chofer_id: String(fd.get("chofer")),
    pasajero_id: data?.claims?.sub ?? "",
    estrellas,
    etiquetas: fd.getAll("etiquetas").map(String).filter((e) => ETIQUETAS.includes(e)),
    comentario,
  })
  if (error) return { error: "No se pudo guardar tu calificación. Intenta de nuevo.", intento }
  actualizarApp()
  // Calificando después (Mis viajes R51, Choferes R46) se vuelve ahí; al terminar el viaje, a Inicio
  const volver = fd.get("volver")
  redirect(volver === "mis-viajes" ? "/mis-viajes" : volver === "choferes" ? "/choferes" : "/inicio")
}

/** "Ahora no": se puede calificar después desde Choferes o Mis viajes (R45) */
export async function omitirCalificacion(reservaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("omitir_calificacion", { p_reserva: reservaId })
  if (error) return { error: error.message }
  actualizarApp()
  redirect("/inicio")
}

export type PosicionChofer = { lat: number; lng: number; actualizadaEn: string } | null

/**
 * Por dónde va el carro (R41). RLS solo deja ver la de choferes conectados; aquí se descarta la vieja (R42).
 * El mapa la lee al abrirse; después le llegan las nuevas por Realtime.
 */
export async function posicionDeChofer(choferId: string): Promise<PosicionChofer> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.from("posiciones").select("lat, lng, actualizada_en").eq("chofer_id", choferId).maybeSingle()
  if (!data || Date.now() - new Date(data.actualizada_en).getTime() > 10 * 60_000) return null
  return { lat: data.lat, lng: data.lng, actualizadaEn: data.actualizada_en }
}
