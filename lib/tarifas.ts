// El pasaje (docs/especificacion.md §5.19, R79–R80): Bs. 1.000; de noche y los domingos, Bs. 1.300 (hora de Caracas)
import { bolivares } from "@/lib/bancos"

export const PASAJE_NORMAL = 1000
export const PASAJE_ESPECIAL = 1300
const NOCHE_DESDE = 18 // 6:00 p. m.
const NOCHE_HASTA = 5 // hasta las 5:00 a. m.
const AVISAR_ANTES_MIN = 30 // el aviso de la nocturna aparece media hora antes

export type TipoTarifa = "normal" | "nocturna" | "domingo"
export type Tarifa = { monto: number; tipo: TipoTarifa }

const ZONA = "America/Caracas"
function enCaracas(d: Date) {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: ZONA, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d)
  const valor = (t: string) => partes.find((p) => p.type === t)?.value ?? ""
  return { domingo: valor("weekday") === "Sun", hora: Number(valor("hour")), minuto: Number(valor("minute")) }
}

/** La tarifa a esa hora (R79): domingo todo el día; de noche, de 6:00 p. m. a 5:00 a. m. */
export function tarifaEn(fecha: Date): Tarifa {
  const { domingo, hora } = enCaracas(fecha)
  if (domingo) return { monto: PASAJE_ESPECIAL, tipo: "domingo" }
  if (hora >= NOCHE_DESDE || hora < NOCHE_HASTA) return { monto: PASAJE_ESPECIAL, tipo: "nocturna" }
  return { monto: PASAJE_NORMAL, tipo: "normal" }
}

/** "Bs. 1.300 · tarifa nocturna" / "Bs. 1.000" */
export const textoTarifa = (t: Tarifa) =>
  t.tipo === "normal" ? bolivares(t.monto) : `${bolivares(t.monto)} · ${t.tipo === "domingo" ? "tarifa de domingo" : "tarifa nocturna"}`

export type AvisoTarifa = { clave: string; titulo: string; texto: string }

/**
 * El aviso de tarifa especial para Inicio del pasajero (R80): solo mientras rige, o media hora antes de la nocturna.
 * `clave` es una por noche o domingo, para que al cerrarlo no vuelva en ese período.
 */
export function avisoDeTarifa(ahora: Date): AvisoTarifa | null {
  const t = tarifaEn(ahora)
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora)
  if (t.tipo === "domingo") {
    return { clave: `domingo:${dia}`, titulo: `Hoy es domingo: el pasaje es ${bolivares(t.monto)}`, texto: "Tarifa de domingo, todo el día." }
  }
  if (t.tipo === "nocturna") {
    // Después de medianoche sigue siendo "la noche de ayer"
    const noche = enCaracas(ahora).hora < NOCHE_HASTA ? new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(ahora.getTime() - 86_400_000)) : dia
    return { clave: `noche:${noche}`, titulo: `Tarifa nocturna: el pasaje es ${bolivares(t.monto)}`, texto: "Desde las 6:00 p. m. hasta las 5:00 a. m." }
  }
  const { hora, minuto } = enCaracas(ahora)
  const faltan = (NOCHE_DESDE - hora) * 60 - minuto
  if (faltan > 0 && faltan <= AVISAR_ANTES_MIN) {
    return { clave: `noche:${dia}`, titulo: `Desde las 6:00 p. m. el pasaje es ${bolivares(PASAJE_ESPECIAL)}`, texto: "Tarifa nocturna, hasta las 5:00 a. m." }
  }
  return null
}
