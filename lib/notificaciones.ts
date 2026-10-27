// Notificaciones (docs/especificacion.md §5.23): tipos que comparten el servidor y las pantallas
export type TipoNotificacion = "aviso" | "consejo" | "novedad"

export const TIPOS_NOTIFICACION: { id: TipoNotificacion; titulo: string }[] = [
  { id: "aviso", titulo: "Aviso" },
  { id: "consejo", titulo: "Consejo" },
  { id: "novedad", titulo: "Novedad" },
]
