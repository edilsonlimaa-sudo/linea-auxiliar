// Por qué el chofer cancela un viaje y quién lo cerró (docs/especificacion.md R72). Los mismos valores que los checks
// de viaje_cierres y la función cancelar_viaje

export const MOTIVOS_CANCELAR = ["cambiar_hora", "me_equivoque", "nadie", "lleno_fuera", "carro", "no_sigo", "otra"] as const
export type MotivoCancelar = (typeof MOTIVOS_CANCELAR)[number]

/** Lo que toca el chofer */
export const OPCION_CANCELAR: Record<MotivoCancelar, string> = {
  cambiar_hora: "Quiero cambiar la hora",
  me_equivoque: "Me equivoqué al publicar",
  nadie: "No había nadie para recoger",
  lleno_fuera: "Se llenó por fuera de la app",
  carro: "Problema con el carro",
  no_sigo: "Terminé por hoy / no puedo seguir",
  otra: "Otra razón",
}

/** Cómo lo lee el admin */
export const DETALLE_CANCELAR: Record<MotivoCancelar, string> = {
  cambiar_hora: "Quería cambiar la hora",
  me_equivoque: "Se equivocó al publicar",
  nadie: "No había nadie para recoger",
  lleno_fuera: "Se llenó por fuera de la app",
  carro: "Problema con el carro",
  no_sigo: "Terminó por hoy / no podía seguir",
  otra: "Otra razón",
}

export type CerradoPor = "chofer" | "chofer_desconectar" | "admin" | "admin_desconectar"

/** Quién cerró el viaje, para el admin */
export const QUIEN_CERRO: Record<CerradoPor, string> = {
  chofer: "Lo canceló el chofer",
  chofer_desconectar: "El chofer se desconectó",
  admin: "Lo cerró el admin",
  admin_desconectar: "El admin desconectó al chofer",
}

/** Por qué se canceló, contado al pasajero que tenía puesto (interfaz nueva, R24). "otra" no explica nada */
export const MOTIVO_PARA_EL_PASAJERO: Record<MotivoCancelar, ((chofer: string) => string) | null> = {
  cambiar_hora: (c) => `${c} cambió la hora del viaje.`,
  me_equivoque: (c) => `${c} publicó el viaje por error.`,
  nadie: (c) => `${c} no pudo salir con este viaje.`,
  lleno_fuera: (c) => `El carro de ${c} se llenó por fuera de la app.`,
  carro: (c) => `${c} tuvo un problema con el carro.`,
  no_sigo: (c) => `${c} terminó por hoy.`,
  otra: null,
}

/** Cuando no lo cerró el chofer con un motivo */
export const CIERRE_PARA_EL_PASAJERO: Record<CerradoPor, ((chofer: string) => string) | null> = {
  chofer: null,
  chofer_desconectar: (c) => `${c} se desconectó.`,
  admin: () => "La Línea cerró el viaje.",
  admin_desconectar: () => "La Línea cerró el viaje.",
}

export const esMotivoCancelar = (m: unknown): m is MotivoCancelar => MOTIVOS_CANCELAR.includes(m as MotivoCancelar)
