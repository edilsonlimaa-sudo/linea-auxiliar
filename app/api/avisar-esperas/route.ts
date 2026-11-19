// R94 desde la app nativa del chofer (R110): después de publicar, la app llama aquí con su sesión (Authorization: Bearer
// <access token de Supabase>) y el servidor avisa a quien espera un carro al Centro, igual que al publicar desde la web
// (lib/avisar-esperas.ts). Las claves de los avisos (VAPID) viven solo aquí, nunca en el teléfono. La base decide qué
// avisar con la sesión del chofer (`avisar_esperas`: solo sus viajes recién publicados, una vez); sin sesión válida no
// hace nada. Está en las rutas públicas del proxy: no tiene cookie, se autentica con el token
import { createClient } from "@supabase/supabase-js"

import { avisarQuienEspera } from "@/lib/avisar-esperas"
import { avisarGina } from "@/lib/avisar-gina"
import type { Database } from "@/lib/database.types"

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return new Response(null, { status: 401 })

  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  // Que el token sea de verdad una sesión (firma y vencimiento)
  const { data } = await supabase.auth.getClaims(token)
  if (!data?.claims?.sub) return new Response(null, { status: 401 })

  // R116: con `{ gina: <viaje> }` (después de avisar que llega o de llegar a Gina) avisa a la lista; si no, R94
  const cuerpo = (await request.json().catch(() => null)) as { gina?: unknown } | null
  if (typeof cuerpo?.gina === "string") await avisarGina(supabase, cuerpo.gina)
  else await avisarQuienEspera(supabase)
  return new Response(null, { status: 204 })
}
