// Reglas de presentación de los viajes (docs/especificacion.md §5.3–5.10). Funciones puras: sin base de datos.
import type { Database } from "@/lib/database.types"

export type Sentido = Database["public"]["Enums"]["sentido"]
export type EstadoViaje = Database["public"]["Enums"]["estado_viaje"]
export type Viaje = Database["public"]["Tables"]["viajes"]["Row"]

export const ABIERTOS: EstadoViaje[] = ["programado", "en_camino", "llegando", "en_parada"]
export const ACTIVOS: EstadoViaje[] = [...ABIERTOS, "en_ruta"]

// enRecogida: dónde recoge el carro (zona de salida) · hacia: adónde lleva. Para frases que no se presten a confusión (R39)
export const SENTIDOS: Record<
  Sentido,
  { corto: string; largo: string; desde: string; destino: string; zona: "valle_grande" | "centro"; enRecogida: string; hacia: string }
> = {
  vg_a_centro: {
    corto: "Al Centro",
    largo: "Valle Grande → Centro",
    desde: "Valle Grande",
    destino: "Centro de Maturín",
    zona: "valle_grande",
    enRecogida: "en Valle Grande",
    hacia: "hacia el Centro",
  },
  centro_a_vg: {
    corto: "A Valle Grande",
    largo: "Centro → Valle Grande",
    desde: "Centro",
    destino: "Valle Grande",
    zona: "centro",
    enRecogida: "en el Centro",
    hacia: "hacia Valle Grande",
  },
}

/** "Al Centro" → "al Centro", para usar dentro de una frase */
export const haciaEnFrase = (s: Sentido) => SENTIDOS[s].corto[0].toLowerCase() + SENTIDOS[s].corto.slice(1)

const MIN = 60_000
const ZONA_HORARIA = "America/Caracas"

const horaCorta = (ms: number) =>
  new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit", timeZone: ZONA_HORARIA }).format(new Date(ms))

/** 70 → "1 h 10 min" */
export function duracion(minutos: number): string {
  const m = Math.max(0, Math.round(minutos))
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`
}

/**
 * Minutos hasta que el carro llegue a recoger (R39).
 * Un viaje "programado" llega después de recoger en el anterior de la cadena + el trayecto (o la hora fija si es mayor).
 */
export function minutosPara(v: Viaje, porId: Map<string, Viaje>, ahora = Date.now()): number {
  switch (v.estado) {
    case "en_parada":
      return 0
    case "llegando":
      return 2
    case "en_ruta":
    case "finalizado":
    case "cancelado":
      return Infinity
    case "programado": {
      const anterior = v.despues_de ? porId.get(v.despues_de) : undefined
      const cadena = (anterior && ABIERTOS.includes(anterior.estado) ? minutosPara(anterior, porId, ahora) : 0) + v.eta_min
      const fija = v.hora_fija ? (new Date(v.hora_fija).getTime() - ahora) / MIN : 0
      return Math.max(cadena, fija)
    }
    default:
      return Math.max(0, (new Date(v.estado_en).getTime() + v.eta_min * MIN - ahora) / MIN)
  }
}

/**
 * Texto principal de "cuándo te recoge" y un detalle (hora) para cada estado (R39).
 * Se dice desde el pasajero, con "recoge en <zona>": "llega a Valle Grande" se leía como "el viaje termina en
 * Valle Grande" (viene de vuelta), justo lo contrario.
 */
export function llegada(v: Viaje, porId: Map<string, Viaje>, ahora = Date.now()): { principal: string; detalle?: string } {
  const { enRecogida, hacia } = SENTIDOS[v.sentido]
  if (v.estado === "en_parada") return { principal: `Recogiendo ahora ${enRecogida}` }
  if (v.estado === "llegando") return { principal: `Recoge ${enRecogida} en 2 o 3 minutos` }
  if (v.estado === "en_ruta") return { principal: `Ya salió ${hacia}` }
  const m = minutosPara(v, porId, ahora)
  const hora = horaCorta(ahora + m * MIN)
  if (v.estado === "programado") {
    return { principal: `Recoge ${enRecogida} a las ${hora}`, detalle: `en unos ${duracion(m)}, al terminar su viaje actual` }
  }
  // Pasó el tiempo que dijo el chofer y todavía no avisó que llega
  if (m < 1) return { principal: `Recoge ${enRecogida} en cualquier momento` }
  return { principal: `Recoge ${enRecogida} en ~${duracion(m)}`, detalle: `a las ${hora}` }
}

/** Hora en que el chofer dijo que llega a recoger (en camino) */
export const horaAnunciada = (v: Viaje) => horaCorta(new Date(v.estado_en).getTime() + v.eta_min * MIN)

/** Lo que el chofer lee arriba de su viaje: qué está haciendo y qué les dijo a los pasajeros */
export function estadoParaChofer(v: Viaje, porId: Map<string, Viaje>, ahora = Date.now()): { titulo: string; detalle: string } {
  const { enRecogida, hacia } = SENTIDOS[v.sentido]
  const confirmados = Math.min(v.ocupados, v.puestos)
  switch (v.estado) {
    case "programado":
      return { titulo: `Próximo: recoges ${enRecogida} a las ${horaCorta(ahora + minutosPara(v, porId, ahora) * MIN)}`, detalle: "Empieza solo cuando sales con el viaje anterior" }
    case "en_camino": {
      const m = minutosPara(v, porId, ahora)
      return m >= 1
        ? { titulo: `Vas a recoger ${enRecogida}`, detalle: `Dijiste que llegas en ~${duracion(m)} (a las ${horaAnunciada(v)})` }
        : { titulo: `Vas a recoger ${enRecogida}`, detalle: `Ya pasó la hora que dijiste (${horaAnunciada(v)}). Avisa cuando estés llegando.` }
    }
    case "llegando":
      return { titulo: `Llegando a recoger ${enRecogida}`, detalle: "Tus pasajeros saben que llegas en 2 o 3 minutos" }
    case "en_parada":
      return {
        titulo: `Recogiendo ${enRecogida}`,
        detalle: confirmados === 0 ? "Todavía no tienes pasajeros" : confirmados === 1 ? "Sube el puesto 1" : `Suben los puestos 1 al ${confirmados}`,
      }
    case "en_ruta":
      return { titulo: `En ruta ${hacia}`, detalle: v.ocupados === 1 ? "1 pasajero a bordo" : `${v.ocupados} pasajeros a bordo` }
    default:
      return { titulo: ETIQUETA_ESTADO[v.estado], detalle: "" }
  }
}

export const ETIQUETA_ESTADO: Record<EstadoViaje, string> = {
  programado: "Próximo viaje",
  en_camino: "En camino",
  llegando: "Llegando",
  en_parada: "Recogiendo",
  en_ruta: "En ruta",
  finalizado: "Terminado",
  cancelado: "Cancelado",
}

export const libres = (v: Viaje) => Math.max(0, v.puestos - v.ocupados)

/** Personas en lista de espera (ocupados cuenta todas las reservas activas, también las que no tienen puesto) */
export const enEspera = (v: Viaje) => Math.max(0, v.ocupados - v.puestos)

/** ¿Se puede pedir puesto? Abierto, o en ruta con puestos libres (pedido en el camino, R28) */
export const aceptaReservas = (v: Viaje) => ABIERTOS.includes(v.estado) || (v.estado === "en_ruta" && libres(v) > 0)

/** Orden para el pasajero: primero los que aceptan, con puestos libres y que llegan antes (R16) */
export function ordenarParaPasajero<T extends Viaje>(viajes: T[], porId: Map<string, Viaje>, ahora = Date.now()): T[] {
  return [...viajes].sort(
    (a, b) =>
      Number(b.estado !== "en_ruta") - Number(a.estado !== "en_ruta") ||
      Number(libres(b) > 0) - Number(libres(a) > 0) ||
      minutosPara(a, porId, ahora) - minutosPara(b, porId, ahora)
  )
}

/** Para "Cambiarme a otra unidad" (R22): otras del mismo sentido que aceptan reservas y tienen puesto libre */
export function otrasConPuesto<T extends Viaje>(viajes: T[], actual: Viaje, porId: Map<string, Viaje>): T[] {
  return ordenarParaPasajero(
    viajes.filter((v) => v.id !== actual.id && v.sentido === actual.sentido && aceptaReservas(v) && libres(v) > 0),
    porId
  )
}

/** ¿La reserva tiene puesto (no está en lista de espera)? */
export const tienePuesto = (posicion: number, v: Viaje) => posicion > 0 && posicion <= v.puestos

/**
 * Sentido sugerido al abrir la app: quien vive en Valle Grande suele ir al Centro en la mañana y volver en la tarde
 * (y al revés quien vive en el Centro). Se puede cambiar con un toque.
 */
export function sentidoSugerido(urbanismo: string | null, ahora = new Date()): Sentido {
  const hora = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: ZONA_HORARIA }).format(ahora))
  const manana = hora < 12
  const viveEnCentro = urbanismo === "Centro de Maturín"
  if (viveEnCentro) return manana ? "centro_a_vg" : "vg_a_centro"
  return manana ? "vg_a_centro" : "centro_a_vg"
}

/** "Carmen Rivas" → "Carmen R." */
export function nombreCorto(nombre: string): string {
  const [primero, segundo] = nombre.trim().split(/\s+/)
  return segundo ? `${primero} ${segundo[0]}.` : primero
}

/** "Carmen Rivas" → "CR" */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}
