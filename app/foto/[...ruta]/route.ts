import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

// Una foto del bucket privado "fotos" con dirección fija (R54): pide sesión y deja que el teléfono la guarde. El nombre
// lleva la hora de subida ("perfil-1792…jpg"): al cambiar la foto cambia la dirección, así que nunca queda una vieja.
const RUTA_VALIDA = /^[0-9a-f-]{36}\/(perfil|carro)-\d+\.jpg$/

export async function GET(_req: Request, ctx: RouteContext<"/foto/[...ruta]">) {
  const { ruta: partes } = await ctx.params
  const ruta = partes.join("/")
  if (!RUTA_VALIDA.test(ruta)) return new Response("No encontrada", { status: 404 })

  const supabase = await crearClienteServidor()
  const { data: sesion } = await supabase.auth.getClaims()
  if (!sesion?.claims?.sub) return new Response("Sin sesión", { status: 401 })

  // Con la sesión de la persona: la política del bucket decide (solo usuarios con sesión)
  const { data, error } = await supabase.storage.from("fotos").download(ruta)
  if (error || !data) return new Response("No encontrada", { status: 404 })

  return new Response(data, {
    headers: {
      "Content-Type": "image/jpeg",
      // private: solo el navegador de quien la pidió, nunca un caché compartido. Un año e inmutable (ver arriba)
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  })
}
