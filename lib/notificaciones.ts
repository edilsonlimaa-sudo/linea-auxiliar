// Notificaciones (docs/especificacion.md §5.23): tipos que comparten el servidor y las pantallas
export type TipoNotificacion = "aviso" | "consejo" | "novedad"

export const TIPOS_NOTIFICACION: { id: TipoNotificacion; titulo: string }[] = [
  { id: "aviso", titulo: "Aviso" },
  { id: "consejo", titulo: "Consejo" },
  { id: "novedad", titulo: "Novedad" },
]

/** R88: a dónde puede llevar el botón de una notificación (solo pantallas de la interfaz nueva; la base lo vuelve a revisar) */
export const DESTINOS_BOTON: { destino: string; titulo: string; texto: string }[] = [
  { destino: "/n/salida-fija", titulo: "Encuesta de la salida fija (R108)", texto: "Quiero mi puesto" },
  { destino: "/n/a-valle-grande", titulo: "A Valle Grande (la lista en Gina)", texto: "Ver la lista" },
  { destino: "/n/al-centro", titulo: "Al Centro", texto: "Ver los carros" },
]

export const MAX_BOTON = 24

export type BotonNotificacion = { texto: string; destino: string }
