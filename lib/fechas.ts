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
