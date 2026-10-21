// Por qué alguien toca "Me fui" en la lista hacia Valle Grande (docs/especificacion.md R62). Los mismos valores que
// el check de lista_gina_privado.motivo_salida y la función me_fui

export const MOTIVOS_SALIDA = ["van", "otro_carro", "cansado", "cambio_planes", "otra"] as const
export type MotivoMeFui = (typeof MOTIVOS_SALIDA)[number]

/** Lo que toca el pasajero */
export const OPCION_ME_FUI: Record<MotivoMeFui, string> = {
  van: "Me fui en la van",
  otro_carro: "En otro carro o taxi",
  cansado: "Me cansé de esperar",
  cambio_planes: "Cambié de planes",
  otra: "Otra razón",
}

/** Cómo lo lee el admin en el historial */
export const DETALLE_ME_FUI: Record<MotivoMeFui, string> = {
  van: "Se fue en la van",
  otro_carro: "Se fue en otro carro o taxi",
  cansado: "Se cansó de esperar",
  cambio_planes: "Cambió de planes",
  otra: "Se fue (otra razón)",
}

export const esMotivoMeFui = (m: unknown): m is MotivoMeFui => MOTIVOS_SALIDA.includes(m as MotivoMeFui)
