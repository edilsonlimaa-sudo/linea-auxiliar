// Temporada navideña (docs/especificacion.md §5.25, R98–R101): solo presentación, por la fecha de Caracas.
import { diaDeHoy } from "@/lib/fechas"

export const NAVIDAD = {
  desde: "2026-11-09", // R98: empieza el tema y el arbolito
  arbolHasta: "2026-12-24", // R100: el último día que cuelga esferas
  navidad: "2026-12-25",
  hasta: "2027-01-06", // R98: Reyes, el último día del tema
  esferas: 24, // R100: con 24 queda completo
} as const

export type Temporada = {
  /** El arbolito todavía cuelga esferas (hasta el 24/12) */
  cuentaEsferas: boolean
  /** "Faltan 17 días para Navidad", "¡Mañana es Navidad!", "¡Hoy es Navidad!"; null después del 25/12 */
  cuentaRegresiva: string | null
}

const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

/** El día de la temporada: en desarrollo, `TEMPORADA_FECHA=AAAA-MM-DD` lo finge (para probar antes); en producción no */
function hoyDeTemporada(ahora: Date): string {
  const fingida = process.env.NODE_ENV !== "production" ? process.env.TEMPORADA_FECHA : undefined
  return fingida && /^\d{4}-\d{2}-\d{2}$/.test(fingida) ? fingida : diaDeHoy(ahora)
}

/** La temporada de hoy, o null fuera de las fechas (R98). `anticipada`: las cuentas de prueba (R86) la ven desde antes */
export function temporadaNavidad(ahora = new Date(), anticipada = false): Temporada | null {
  const hoy = hoyDeTemporada(ahora)
  if ((!anticipada && hoy < NAVIDAD.desde) || hoy > NAVIDAD.hasta) return null
  const dias = diasEntre(hoy, NAVIDAD.navidad)
  const cuentaRegresiva =
    dias < 0 ? null : dias === 0 ? "¡Hoy es Navidad!" : dias === 1 ? "¡Mañana es Navidad!" : `Faltan ${dias} días para Navidad`
  return { cuentaEsferas: hoy <= NAVIDAD.arbolHasta, cuentaRegresiva }
}

/** Los instantes en que un viaje cuelga esfera (R100): de las 00:00 del 9/11 a las 24:00 del 24/12, hora de Caracas */
export const VENTANA_ESFERAS = {
  desde: `${NAVIDAD.desde}T00:00:00-04:00`,
  hasta: `${NAVIDAD.navidad}T00:00:00-04:00`,
} as const

// R99: una frase del día mientras espera en la lista (cambia cada día, la misma para todos)
const FRASES = [
  "¿Ya compraste el pan de jamón?",
  "¿Ya hiciste las hallacas este año?",
  "Ponle gaitas a la espera: el carro ya viene.",
  "¿Ya armaste el arbolito en tu casa?",
  "¿Quién trae el dulce de lechosa este año?",
  "Diciembre se vive con los vecinos.",
  "¿Ya estrenaste algo para las fiestas?",
] as const

export function fraseDelDia(ahora = new Date()): string {
  const dia = diasEntre(NAVIDAD.desde, hoyDeTemporada(ahora))
  return FRASES[((dia % FRASES.length) + FRASES.length) % FRASES.length]
}
