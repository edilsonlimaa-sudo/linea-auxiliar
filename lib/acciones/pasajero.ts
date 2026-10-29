"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { esMotivoMeFui, type MotivoMeFui } from "@/lib/motivos-salida"
import { destinoPara } from "@/lib/sesion"
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
 * Apartar puesto (R16–R29). El lugar llega de la hoja "¿Dónde te recogemos?" (R27). Sin hoja (al cambiarse de unidad
 * desde la lista de espera, R22) se usa el de su reserva actual o, si no, el de su espera.
 */
export async function apartarPuesto(viajeId: string, datos?: FormData): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { data: sesion } = await supabase.auth.getClaims()
  const yo = sesion?.claims?.sub
  if (!yo) return { error: "Tu sesión terminó. Vuelve a entrar." }

  // Cuántos van (R57): de la hoja o, al cambiarse de unidad, los mismos de su reserva
  let origen: { lugar: string | null; lat: number | null; lng: number | null; personas: number } | null = null
  if (datos) {
    origen = {
      lugar: texto(datos, "lugar") ?? null,
      lat: numero(datos, "lat") ?? null,
      lng: numero(datos, "lng") ?? null,
      personas: numero(datos, "personas") ?? 1,
    }
    if (!origen.lugar) return { error: "Escribe dónde estás." }
  } else {
    const [reservaRes, esperaRes] = await Promise.all([
      supabase.from("reservas").select("lugar, lat, lng, personas").eq("pasajero_id", yo).eq("estado", "activa").maybeSingle(),
      supabase.from("esperas").select("lugar, lat, lng, personas").eq("pasajero_id", yo).eq("estado", "esperando").maybeSingle(),
    ])
    origen = reservaRes.data ?? esperaRes.data
    if (!origen) return { error: "Dinos dónde te recogemos." }
  }

  const { error } = await supabase.rpc("reservar", {
    p_viaje: viajeId,
    p_lugar: origen.lugar ?? undefined,
    p_lat: origen.lat ?? undefined,
    p_lng: origen.lng ?? undefined,
    p_personas: origen.personas,
  })
  if (error) return { error: error.message }
  actualizarApp()
  // Apartar es pasar de escoger a acompañar el viaje: se abre su página (docs/especificacion.md §8)
  redirect(await destinoPara("/mi-viaje"))
}

/** "Ya no voy": libera el puesto y el siguiente sube solo (R20) */
export async function liberarPuesto(reservaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("cancelar_reserva", { p_reserva: reservaId })
  if (error) return { error: error.message }
  actualizarApp()
  redirect(await destinoPara("/inicio"))
}

/** "✋ Ya estoy en el sitio" (R23) */
export async function avisarQueLlegue(reservaId: string, listo: boolean): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("marcar_listo", { p_reserva: reservaId, p_listo: listo })
  if (error) return { error: error.message }
  revalidatePath("/mi-viaje")
  revalidatePath("/n")
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
  // Interfaz nueva: vuelve a la pantalla desde donde calificó (solo direcciones de /n)
  if (typeof volver === "string" && /^\/n(\/[\w-]+)*$/.test(volver)) redirect(volver)
  // R82: contento con el viaje (4–5 estrellas), Inicio puede pedir su opinión sobre la app
  redirect(volver === "mis-viajes" ? "/mis-viajes" : volver === "choferes" ? "/choferes" : await destinoPara(estrellas >= 4 ? "/inicio?valorar=1" : "/inicio"))
}

/** "Ahora no": se puede calificar después desde Choferes o Mis viajes (R45) */
export async function omitirCalificacion(reservaId: string): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("omitir_calificacion", { p_reserva: reservaId })
  if (error) return { error: error.message }
  actualizarApp()
  redirect(await destinoPara("/inicio"))
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

/** Posiciones recientes de todos los choferes conectados, para el mapa de La línea (§8, R41–R42) */
export async function posicionesDeLaLinea(): Promise<Record<string, { lat: number; lng: number; actualizadaEn: string }>> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("posiciones")
    .select("chofer_id, lat, lng, actualizada_en")
    .gte("actualizada_en", new Date(Date.now() - 10 * 60_000).toISOString())
  return Object.fromEntries((data ?? []).map((p) => [p.chofer_id, { lat: p.lat, lng: p.lng, actualizadaEn: p.actualizada_en }]))
}

/** Cambiar dónde lo recogen, con la reserva activa (R27) */
export async function cambiarLugar(reservaId: string, datos: FormData): Promise<Resultado> {
  const lugar = texto(datos, "lugar")
  const lat = numero(datos, "lat")
  const lng = numero(datos, "lng")
  if (!lugar) return { error: "Escribe dónde estás." }
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("cambiar_lugar", { p_reserva: reservaId, p_lugar: lugar, p_lat: lat, p_lng: lng })
  if (error) return { error: error.message }
  revalidatePath("/mi-viaje")
  revalidatePath("/n")
  return { ok: true }
}

// ---------- Lista de Gina: Centro → Valle Grande (docs/especificacion.md §5.17) ----------

async function llamarLista(fn: (s: Awaited<ReturnType<typeof crearClienteServidor>>) => PromiseLike<{ error: { message: string } | null }>): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await fn(supabase)
  if (error) return { error: error.message }
  actualizarApp()
  return { ok: true }
}

/**
 * "Estoy en Gina" o "Estoy en …" del camino (R62). distanciaM: qué tan lejos de Gina estaba según su GPS (para
 * medir abusos); null sin GPS.
 */
export async function estoyEnLista(d: {
  enGina: boolean
  lugar: string | null
  lat: number | null
  lng: number | null
  personas: number
  distanciaM: number | null
}): Promise<Resultado> {
  const r = await llamarLista((s) =>
    s.rpc("estoy_en_lista", {
      p_en_gina: d.enGina,
      ...(d.lugar ? { p_lugar: d.lugar } : {}),
      ...(d.lat !== null && d.lng !== null ? { p_lat: d.lat, p_lng: d.lng } : {}),
      p_personas: d.personas,
      ...(d.distanciaM !== null ? { p_distancia_m: Math.round(d.distanciaM) } : {}),
    })
  )
  // Anotado (§5.17): en la nueva se queda en A Valle Grande (su lugar; Mi viaje empieza al montarse); en la clásica, Mi viaje
  if (r.ok) {
    const destino = await destinoPara("/mi-viaje")
    redirect(destino.startsWith("/n") ? "/n/a-valle-grande" : destino)
  }
  return r
}

/** "Sí, sigo aquí" (R62) */
export async function sigoEnLista(): Promise<Resultado> {
  return llamarLista((s) => s.rpc("sigo_en_lista"))
}

/** "Me fui" (R62), con cómo se va (en la van, en otro carro…) */
export async function meFui(motivo: MotivoMeFui): Promise<Resultado> {
  if (!esMotivoMeFui(motivo)) return { error: "Escoge una opción" }
  return llamarLista((s) => s.rpc("me_fui", { p_motivo: motivo }))
}

/** R94: avisarme cuando haya un carro al Centro, por las próximas 2 horas */
export async function pedirAvisoAlCentro(): Promise<Resultado> {
  // La Línea fija el tiempo (R94): 2 horas, como cualquier espera (R35)
  const instante = new Date(Date.now() + 2 * 3_600_000)
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("pedir_aviso", { p_sentido: "vg_a_centro", p_hasta: instante.toISOString() })
  if (error) return { error: error.message }
  revalidatePath("/n", "layout")
  return { ok: true }
}

