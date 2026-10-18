// Cálculos de mapa sin dependencias (sirven en el servidor y en el navegador)

export type Punto = { lat: number; lng: number }

/** Distancia en metros entre dos puntos (fórmula de haversine) */
export function distanciaMetros(a: Punto, b: Punto): number {
  const R = 6_371_000
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** 744 → "744 m", 2340 → "2,3 km" */
export function distanciaTexto(metros: number): string {
  if (metros < 1000) return `${Math.max(10, Math.round(metros / 10) * 10)} m`
  return `${(metros / 1000).toFixed(1).replace(".", ",")} km`
}

/** Una posición con más de 10 min se considera vieja y no se muestra (R42) */
export const POSICION_VIEJA_MS = 10 * 60_000
