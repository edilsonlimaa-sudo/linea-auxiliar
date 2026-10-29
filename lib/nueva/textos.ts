// Textos puros del chofer: fuera de los archivos "use client" para que también los use el servidor
export const personasTexto = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)
export const puestosTexto = (n: number) => (n === 1 ? "1 puesto" : `${n} puestos`)

type EstadoViaje = "programado" | "en_camino" | "llegando" | "en_parada" | "en_ruta"

/** Los nombres de los estados del viaje, como en el prototipo */
export const ETIQUETA: Partial<Record<EstadoViaje, string>> = {
  en_camino: "Publicado",
  llegando: "Llegando a la zona",
  en_parada: "Recogiendo pasajeros",
  en_ruta: "En ruta",
}

/** Lo mismo, corto, para las pestañas de los viajes */
export const ETAPA: Record<EstadoViaje, string> = {
  programado: "Siguiente",
  en_camino: "Publicado",
  llegando: "Llegando",
  en_parada: "Recogiendo",
  en_ruta: "En ruta",
}
