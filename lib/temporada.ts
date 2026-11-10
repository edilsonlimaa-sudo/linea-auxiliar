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

// R99: una frase del día mientras espera en la lista (cambia cada día, la misma para todos). Las que dependen de la
// fecha llevan su ventana (desde/hasta, inclusive); la rueda gira entre las que valen ese día
type Frase = { texto: string; desde?: string; hasta?: string }
const FRASES: readonly Frase[] = [
  { texto: "¿Ya compraste el pan de jamón?" },
  { texto: "¿Ya probaste el ponche crema de este año?" },
  { texto: "Diciembre llega rapidito… igual que tu carro.", hasta: "2026-11-30" },
  { texto: "¿Ya hiciste las hallacas este año?" },
  { texto: "Si suena Guaco o Billo's, ya llegó diciembre." },
  { texto: "Cada viaje es una esfera más para tu arbolito. 🎄", hasta: NAVIDAD.arbolHasta },
  { texto: "Ponle gaitas a la espera: el carro ya viene." },
  { texto: "¿Quién amarra las hallacas en tu casa?" },
  { texto: "Faltan pocos días: ve sacando las luces del closet.", hasta: "2026-12-15" },
  { texto: "¿Ya armaste el arbolito en tu casa?" },
  { texto: "¿Ya pusiste el pesebre con el Niño Jesús?" },
  { texto: "¿Hallaca de la abuela o de la tía? Aquí no juzgamos." },
  { texto: "Mientras esperas: ¿qué le vas a pedir al Niño Jesús?", hasta: NAVIDAD.arbolHasta },
  { texto: "¿Quién trae el dulce de lechosa este año?" },
  { texto: "¿Ensalada de gallina con o sin manzana? 🤔" },
  { texto: "El Niño Jesús toma nota de quién espera con paciencia. 😇", hasta: NAVIDAD.arbolHasta },
  { texto: "Diciembre se vive con los vecinos." },
  { texto: "Un carro, un pan de jamón y una gaita: diciembre completo." },
  { texto: "¿Ya fuiste a misa de aguinaldo?", desde: "2026-12-16", hasta: NAVIDAD.arbolHasta },
  { texto: "¿Ya estrenaste algo para las fiestas?" },
  { texto: "¿Pernil o hallaca? ¿Por qué no los dos?" },
  { texto: "Pana, ya viene el carro. Y también diciembre.", hasta: "2026-12-31" },
  { texto: "¿Ya tienes tus estrenos para el 24?", hasta: NAVIDAD.arbolHasta },
  { texto: "Esta Navidad, comparte el puesto y la conversa." },
  { texto: "¿Ya tienes las maletas listas para darle la vuelta a la manzana? 🧳", desde: "2026-12-26", hasta: "2026-12-31" },
  { texto: "Las uvas del 31 ya se están vendiendo. ¿Ya pediste tus deseos?", desde: "2026-12-26", hasta: "2026-12-31" },
]

export function fraseDelDia(ahora = new Date()): string {
  const hoy = hoyDeTemporada(ahora)
  const valen = FRASES.filter((f) => (!f.desde || hoy >= f.desde) && (!f.hasta || hoy <= f.hasta))
  const dia = diasEntre(NAVIDAD.desde, hoy)
  // Las de pocos días (con desde: aguinaldos, Año Nuevo) salen día por medio en su ventana: si no, la rueda las salta
  const deSusDias = valen.filter((f) => f.desde)
  const rueda = deSusDias.length > 0 && dia % 2 === 0 ? deSusDias : valen
  const vuelta = deSusDias.length > 0 && dia % 2 === 0 ? Math.floor(dia / 2) : dia
  return rueda[((vuelta % rueda.length) + rueda.length) % rueda.length].texto
}
