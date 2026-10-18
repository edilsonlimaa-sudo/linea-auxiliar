import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/lib/database.types"

// Cliente de Supabase para Client Components (Realtime, subir fotos, GPS del chofer).
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
