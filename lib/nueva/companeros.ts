import { libres, llegada, SENTIDOS, type Sentido, type Viaje } from "@/lib/viajes"

// Lo que está pasando primero: en ruta, recogiendo, llegando, en camino; los próximos al final
const PRIORIDAD: Record<string, number> = { en_ruta: 0, en_parada: 1, llegando: 2, en_camino: 3, programado: 4 }

export type Situacion = {
  sentido: Sentido | null // el del viaje de ahora
  ahora: string // "En ruta hacia el Centro" · "Llega en ~5 min" · "Conectado, sin viaje publicado."
  lleva: string | null // "Lleva 2 de 4 · 2 libres"
  despues: string[] // "Al Centro · llega a las 3:10 p. m."
}

/** Qué hace un compañero ahora y qué viene después (R7, §8), en texto calculado en el servidor */
export function situacionDe(choferId: string, viajesCompaneros: Viaje[], ahora: number): Situacion {
  const suyos = viajesCompaneros.filter((v) => v.chofer_id === choferId).sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado])
  const porId = new Map<string, Viaje>(suyos.map((v) => [v.id, v]))
  const actual = suyos.find((v) => v.estado !== "programado") ?? null
  const despues = suyos
    .filter((v) => v.estado === "programado")
    .map((v) => `${SENTIDOS[v.sentido].corto} · ${llegada(v, porId, ahora).principal.toLowerCase()}`)
  if (!actual) return { sentido: null, ahora: "Conectado, sin viaje publicado.", lleva: null, despues }
  const n = libres(actual)
  return {
    sentido: actual.sentido,
    ahora: actual.estado === "en_ruta" ? `En ruta ${SENTIDOS[actual.sentido].hacia}` : llegada(actual, porId, ahora).principal,
    lleva: `Lleva ${Math.min(actual.ocupados, actual.puestos)} de ${actual.puestos}${n > 0 ? ` · ${n === 1 ? "1 libre" : `${n} libres`}` : " · lleno"}`,
    despues,
  }
}
