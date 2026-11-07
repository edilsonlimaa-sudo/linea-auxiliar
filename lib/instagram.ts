/** El perfil de la línea en Instagram (R95) */
export const INSTAGRAM = {
  usuario: "lineaauxiliar",
  url: "https://www.instagram.com/lineaauxiliar/",
} as const

/** Después de calificar con 4–5 estrellas, Inicio ofrece seguirnos (R95): `/n?seguir=1` */
export const PARAM_SEGUIR = "seguir"

/**
 * La hoja se ofrece una sola vez por teléfono (R95). Cookie (no localStorage) para que Inicio decida en el servidor si la
 * abre; la pone el navegador al mostrarla.
 */
export const COOKIE_INSTAGRAM = "instagram-ofrecido"

export function marcarInstagramOfrecido() {
  document.cookie = `${COOKIE_INSTAGRAM}=1; path=/; max-age=${60 * 60 * 24 * 365 * 2}; samesite=lax`
}
