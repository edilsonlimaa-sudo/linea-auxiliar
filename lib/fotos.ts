import "server-only"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/**
 * Enlaces firmados (1 h) para fotos del bucket privado "fotos" (R54): solo los ve quien tiene sesión.
 * Recibe rutas (pueden venir nulas o repetidas) y devuelve ruta → URL. Una sola llamada para toda la pantalla.
 */
export async function firmarFotos(rutas: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unicas = [...new Set(rutas.filter((r): r is string => Boolean(r)))]
  if (unicas.length === 0) return new Map()
  const supabase = await crearClienteServidor()
  const { data } = await supabase.storage.from("fotos").createSignedUrls(unicas, 3600)
  const enlaces = new Map<string, string>()
  for (const d of data ?? []) if (d.path && d.signedUrl) enlaces.set(d.path, d.signedUrl)
  return enlaces
}
