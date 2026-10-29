// Interfaz nueva (docs/especificacion.md §5.21): los datos de siempre, ya listos para sus pantallas. Lo que depende de
// la hora (cuándo llega, en cuántos minutos) se calcula aquí, en el servidor, para que el celular no lo recalcule distinto
import "server-only"

import type { DatosPagoMovil } from "@/lib/bancos"
import type { Chofer, ChoferEnServicio, MiReserva, ViajeConChofer } from "@/lib/datos/inicio-pasajero"
import type { EnListaGina } from "@/lib/datos/lista-gina"
import type { MiNotificacion } from "@/lib/datos/notificaciones"
import { hace } from "@/lib/fechas"
import { type Tarifa, tarifaEn } from "@/lib/tarifas"
import {
  aceptaReservas,
  iniciales,
  libres,
  llegada,
  minutosPara,
  SENTIDOS,
  type Sentido,
  tienePuesto,
  type Viaje,
} from "@/lib/viajes"

const horaCorta = (ms: number) =>
  new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(new Date(ms))

/** La hora del pedido, para todo lo que se calcula en una misma página (en el servidor) */
export const ahoraDelPedido = () => Date.now()

export type ChoferVista = {
  id: string
  nombre: string
  iniciales: string
  fotoUrl: string | null
  estrellas: number | null
  calificaciones: number
  carro: { modelo: string | null; color: string | null; placa: string; unidad: string | null; aire: boolean; fotoUrl: string | null } | null
}

export function choferVista(c: Chofer): ChoferVista {
  const v = c.vehiculo
  return {
    id: c.id,
    nombre: c.nombre,
    iniciales: iniciales(c.nombre),
    fotoUrl: c.fotoUrl,
    estrellas: c.estrellas,
    calificaciones: c.calificaciones,
    carro: v ? { modelo: v.modelo, color: v.color, placa: v.placa, unidad: v.unidad, aire: v.aire_acondicionado, fotoUrl: v.fotoUrl } : null,
  }
}

const ESTADO: Record<Viaje["estado"], string> = {
  programado: "Termina un viaje",
  en_camino: "En camino",
  llegando: "Llegando",
  en_parada: "Recogiendo",
  en_ruta: "En ruta",
  finalizado: "Terminado",
  cancelado: "Cancelado",
}

export type UnidadVista = {
  id: string
  sentido: Sentido
  estado: Viaje["estado"]
  etiqueta: string // "En camino", "Recogiendo"…
  llegada: { principal: string; detalle?: string }
  minutos: string | null // el número grande de la tarjeta: "8 min", "Ya"; en ruta, nada
  hora: string | null // a qué hora recoge ("12:14 a. m."), si todavía no llegó
  libres: number
  puestos: number
  aceptaReservas: boolean
  chofer: ChoferVista
}

export function unidadVista(v: ViajeConChofer, porId: Map<string, Viaje>, ahora: number): UnidadVista {
  const m = v.estado === "programado" || v.estado === "en_camino" ? minutosPara(v, porId, ahora) : null
  return {
    id: v.id,
    sentido: v.sentido,
    estado: v.estado,
    etiqueta: ESTADO[v.estado],
    llegada: llegada(v, porId, ahora),
    minutos: v.estado === "en_parada" ? "Ya" : v.estado === "llegando" ? "2 min" : m === null ? null : m < 1 ? "Ya" : `${Math.round(m)} min`,
    hora: m === null || m < 1 ? null : horaCorta(ahora + m * 60_000),
    libres: libres(v),
    puestos: v.puestos,
    aceptaReservas: aceptaReservas(v),
    chofer: choferVista(v.chofer),
  }
}

export type ServicioVista = Pick<ChoferEnServicio, "id" | "nombre" | "fotoUrl" | "actividad"> & { iniciales: string }
export const servicioVista = (c: ChoferEnServicio): ServicioVista => ({
  id: c.id,
  nombre: c.nombre,
  fotoUrl: c.fotoUrl,
  actividad: c.actividad,
  iniciales: iniciales(c.nombre),
})

/** Mi viaje con reserva (§8): en cualquier sentido, esperando el carro o a bordo */
export type MiViajeVista = {
  reservaId: string
  sentido: Sentido
  ruta: string // "Valle Grande → Centro"
  estado: "esperando" | "pendiente" | "va_por_ti" | "a_bordo"
  titulo: string
  subtitulo: string
  puesto: string | null // "Puesto 2 de 4"
  personas: number
  lugar: string
  listo: boolean // tocó "Ya estoy en el sitio"
  puedeCambiarLugar: boolean
  puedeAvisarListo: boolean
  puedeSoltar: boolean // "Ya no voy"
  unidad: UnidadVista
  telefonoChofer: string | null
  pago: DatosPagoMovil | null
  pasaje: Tarifa
  yo: { lat: number; lng: number } | null // para el mapa (R41), si la reserva tiene ubicación
}

export function miViajeVista(m: MiReserva, porId: Map<string, Viaje>, pago: DatosPagoMovil | null, ahora: number): MiViajeVista {
  const { reserva, viaje, desde, hasta } = m
  const nombre = viaje.chofer.nombre.split(" ")[0]
  const grupo = reserva.personas > 1
  const aBordo = reserva.estado === "subio"
  // Lista hacia Valle Grande: esperaba en el camino y el carro salió de Gina con su puesto guardado (R66)
  const vaPorTi = viaje.sentido === "centro_a_vg" && viaje.estado === "en_ruta" && reserva.estado === "activa" && !reserva.pendiente
  const confirmado = tienePuesto(hasta, viaje)
  const lugar = reserva.lugar ?? "Tu ubicación"

  let estado: MiViajeVista["estado"] = "esperando"
  let titulo: string
  let subtitulo: string
  if (aBordo) {
    estado = "a_bordo"
    titulo = grupo ? "Van a bordo" : "Vas a bordo"
    subtitulo = `${viaje.estado === "en_ruta" ? `En ruta ${SENTIDOS[viaje.sentido].hacia}.` : "Ya subiste."} Al llegar podrás contar cómo te fue con ${nombre}.`
  } else if (reserva.pendiente) {
    estado = "pendiente"
    titulo = "Esperando respuesta del chofer"
    subtitulo = "Le pediste que te recoja en el camino. Te avisamos si va por ti."
  } else if (vaPorTi) {
    estado = "va_por_ti"
    titulo = `${nombre} va por ti`
    subtitulo = `Ya salió de Gina con ${grupo ? "sus puestos" : "tu puesto"}. Te recoge al pasar por ${lugar}.`
  } else {
    titulo = grupo ? "Tienen sus puestos" : "Puesto garantizado"
    subtitulo = reserva.aceptada_en ? "El chofer va por ti." : grupo ? "Van juntos en el mismo carro." : "Tu puesto está apartado."
  }

  return {
    reservaId: reserva.id,
    sentido: viaje.sentido,
    ruta: SENTIDOS[viaje.sentido].largo,
    estado,
    titulo,
    subtitulo,
    puesto: confirmado ? (desde === hasta ? `Puesto ${hasta} de ${viaje.puestos}` : `Puestos ${desde} a ${hasta}`) : null,
    personas: reserva.personas,
    lugar,
    listo: reserva.listo,
    puedeCambiarLugar: reserva.estado === "activa",
    puedeAvisarListo: confirmado && !aBordo && !reserva.pendiente && viaje.estado !== "en_ruta",
    puedeSoltar: !aBordo && (viaje.estado !== "en_ruta" || reserva.pendiente || vaPorTi),
    unidad: unidadVista(viaje, porId, ahora),
    telefonoChofer: m.telefonoChofer,
    pago: aBordo ? pago : null, // R74 en la nueva: solo a bordo
    pasaje: tarifaEn(viaje.salida_en ? new Date(viaje.salida_en) : new Date(ahora)),
    yo: reserva.lat !== null && reserva.lng !== null ? { lat: reserva.lat, lng: reserva.lng } : null,
  }
}

/** Mi lugar en la lista hacia Valle Grande (§5.17) */
export type MiListaVista = {
  posicion: number
  delante: number // personas antes
  enGina: boolean
  lugar: string
  personas: number
  venceEn: string
  diceQueSubio: boolean
}

export function miListaVista(lista: EnListaGina[]): MiListaVista | null {
  const mio = lista.find((e) => e.esMio)
  if (!mio) return null
  return {
    posicion: mio.posicion,
    delante: lista.filter((e) => e.posicion < mio.posicion).reduce((n, e) => n + e.personas, 0),
    enGina: mio.enGina,
    lugar: mio.enGina ? "En Gina" : (mio.lugar ?? "En el camino"),
    personas: mio.personas,
    venceEn: mio.venceEn,
    diceQueSubio: mio.diceQueSubio,
  }
}

export type FilaVista = { id: string; posicion: number; nombre: string; iniciales: string; fotoUrl: string | null; personas: number; lugar: string; creadaEn: string; esMio: boolean }
export const filaVista = (e: EnListaGina): FilaVista => ({
  id: e.id,
  posicion: e.posicion,
  nombre: e.esMio ? "Tú" : e.nombre,
  iniciales: e.esMio ? "Tú" : iniciales(e.nombre),
  fotoUrl: e.fotoUrl,
  personas: e.personas,
  lugar: e.enGina ? "En Gina" : (e.lugar ?? "En el camino"),
  creadaEn: e.creadaEn,
  esMio: e.esMio,
})

/** Una notificación como la muestra la pestaña (R89): con su grupo y "hace cuánto" ya calculados */
export type NotificacionVista = MiNotificacion & { grupo: "Hoy" | "Esta semana" | "Antes"; cuando: string }

const diaCaracas = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(t)

export function notificacionVista(n: MiNotificacion, ahora: number): NotificacionVista {
  const t = new Date(n.creadaEn).getTime()
  const grupo = diaCaracas(t) === diaCaracas(ahora) ? "Hoy" : ahora - t < 7 * 86_400_000 ? "Esta semana" : "Antes"
  return { ...n, grupo, cuando: hace(n.creadaEn) }
}
