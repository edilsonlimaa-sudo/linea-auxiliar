import "server-only"

/**
 * Direcciones de las fotos del bucket privado "fotos" (R54): `/foto/<carpeta>/<archivo>`, que sirve
 * app/foto/[...ruta]/route.ts con sesión. Son fijas (no vencen ni cambian al refrescar la pantalla): el teléfono baja
 * cada foto una sola vez. Recibe rutas (pueden venir nulas o repetidas) y devuelve ruta → dirección.
 */
export async function firmarFotos(rutas: (string | null | undefined)[]): Promise<Map<string, string>> {
  const enlaces = new Map<string, string>()
  for (const r of rutas) if (r && !enlaces.has(r)) enlaces.set(r, `/foto/${r.split("/").map(encodeURIComponent).join("/")}`)
  return enlaces
}
