// La temperatura de los pedidos de "Avísame" al Centro para el chofer (docs/especificacion.md R119): qué tan probable es
// que esa persona todavía viaje. Sale de lo que pasó (nov. 2026, 130 pedidos avisados): de los que tenían menos de 15 min
// cuando salió un carro, viajó el 58 %; de 15 a 30 min, el 28 %; de 30 a 60, el 11 %; con más de 60, nadie. Recalcular
// cada mes con la consulta de §5.31.

export type Temperatura = "caliente" | "tibia" | "fria"

/** Minutos desde que pidió: hasta aquí cuenta cada temperatura; después de `FRIA` el chofer ya no lo ve */
export const LIMITES = { caliente: 15, tibia: 30, fria: 60 } as const

/** De cada persona con esa temperatura, cuántas viajan (lo observado) */
export const PROBABILIDAD: Record<Temperatura, number> = { caliente: 0.58, tibia: 0.28, fria: 0.11 }

export const TEMPERATURA: Record<Temperatura, { nombre: string; plural: string }> = {
  caliente: { nombre: "Caliente", plural: "calientes" },
  tibia: { nombre: "Tibia", plural: "tibias" },
  fria: { nombre: "Fría", plural: "frías" },
}

const BAJA: Record<Temperatura, Temperatura> = { caliente: "tibia", tibia: "fria", fria: "fria" }

/**
 * La temperatura por los minutos desde que pidió; si ya se le avisó de un carro y no apartó, una menos (tuvo su
 * oportunidad). Null: pasó la hora, el chofer no lo ve
 */
export function temperaturaDe(minutos: number, avisado: boolean): Temperatura | null {
  if (minutos >= LIMITES.fria) return null
  const t: Temperatura = minutos < LIMITES.caliente ? "caliente" : minutos < LIMITES.tibia ? "tibia" : "fria"
  return avisado ? BAJA[t] : t
}

/** Cuántas personas probablemente viajen: la suma de cada una por su probabilidad, redondeada */
export const probables = (pedidos: { personas: number; temperatura: Temperatura }[]) =>
  Math.round(pedidos.reduce((n, p) => n + p.personas * PROBABILIDAD[p.temperatura], 0))
