// Fechas y horas en America/Caracas (docs/especificacion.md §4)
const ZONA = "America/Caracas"

const relativo = new Intl.RelativeTimeFormat("es-VE", { numeric: "auto" })

/** "hace 5 minutos", "hace 3 horas", "ayer" */
export function hace(fechaIso: string): string {
  const segundos = Math.round((new Date(fechaIso).getTime() - Date.now()) / 1000)
  const abs = Math.abs(segundos)
  if (abs < 60) return "hace un momento"
  if (abs < 3600) return relativo.format(Math.round(segundos / 60), "minute")
  if (abs < 86400) return relativo.format(Math.round(segundos / 3600), "hour")
  return relativo.format(Math.round(segundos / 86400), "day")
}

/** "16 oct 2026, 2:15 p. m." */
export function fechaHora(fechaIso: string): string {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: ZONA }).format(
    new Date(fechaIso)
  )
}

const diaCaracas = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d) // AAAA-MM-DD

/** "2:15 p. m." */
export function hora(fechaIso: string): string {
  return new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit", timeZone: ZONA }).format(new Date(fechaIso))
}

/** "Hoy, 2:15 p. m." · "Ayer, 7:40 a. m." · "jue 16 oct, 2:15 p. m." (para el historial) */
export function diaYHora(fechaIso: string): string {
  const d = new Date(fechaIso)
  const dia = diaCaracas(d)
  const hoy = diaCaracas(new Date())
  const ayer = diaCaracas(new Date(Date.now() - 86_400_000))
  const cuando =
    dia === hoy
      ? "Hoy"
      : dia === ayer
        ? "Ayer"
        : new Intl.DateTimeFormat("es-VE", { weekday: "short", day: "numeric", month: "short", timeZone: ZONA }).format(d)
  return `${cuando}, ${hora(fechaIso)}`
}

/** "16 de octubre de 2026" */
export function fechaLarga(fechaIso: string): string {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "long", timeZone: ZONA }).format(new Date(fechaIso))
}

/** "Buenos días" (5–11 h), "Buenas tardes" (12–18 h) o "Buenas noches", en hora de Caracas */
export function saludo(ahora = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: ZONA }).format(ahora))
  return h >= 5 && h < 12 ? "Buenos días" : h >= 12 && h < 19 ? "Buenas tardes" : "Buenas noches"
}

/** Medianoche de hoy en Caracas (UTC-4, sin horario de verano), menos `dias` días */
export function inicioDelDia(dias = 0, ahora = new Date()): Date {
  return new Date(new Date(`${diaCaracas(ahora)}T00:00:00-04:00`).getTime() - dias * 86_400_000)
}

/** "martes, 20 de octubre": la fecha de hoy en Caracas, para encabezados */
export function hoyEnPalabras(ahora = new Date()): string {
  return new Intl.DateTimeFormat("es-VE", { weekday: "long", day: "numeric", month: "long", timeZone: ZONA }).format(ahora)
}
