// R93 desde la app nativa del chofer: después de crear la cuenta, la app llama aquí con su sesión (Authorization: Bearer
// <access token de Supabase>) y el servidor avisa al admin "Nueva cuenta por aprobar", igual que `registrarse`
// (lib/acciones/cuenta.ts). Las claves de los avisos (VAPID) viven solo aquí, nunca en el teléfono. La base decide si
// avisar (`aviso_de_cuenta_nueva`: cuenta propia, pendiente, de hace menos de 15 min, una sola vez). Está en las rutas
// públicas del proxy: no tiene cookie, se autentica con el token
import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { mandarPush } from "@/lib/push"

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return new Response(null, { status: 401 })

  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  // Que el token sea de verdad una sesión (firma y vencimiento)
  const { data } = await supabase.auth.getClaims(token)
  const yo = data?.claims?.sub
  if (!yo) return new Response(null, { status: 401 })

  const { data: aparatos } = await supabase.rpc("aviso_de_cuenta_nueva")
  if (aparatos?.length) {
    const { data: perfil } = await supabase.from("perfiles").select("nombre, rol").eq("id", yo).maybeSingle()
    const aviso = {
      id: `cuenta-${yo}`,
      titulo: "Nueva cuenta por aprobar",
      texto: `${perfil?.rol === "pasajero" ? "Pasajero" : "Chofer"}: ${perfil?.nombre ?? ""}`,
      url: "/admin/aprobar",
    }
    await mandarPush(aparatos, aviso).catch(() => undefined)
  }
  return new Response(null, { status: 204 })
}
