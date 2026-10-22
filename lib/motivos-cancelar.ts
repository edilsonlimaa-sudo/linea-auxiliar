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

export const esMotivoCancelar = (m: unknown): m is MotivoCancelar => MOTIVOS_CANCELAR.includes(m as MotivoCancelar)
