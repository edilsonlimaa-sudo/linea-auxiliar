import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { Database } from "@/lib/database.types"

// Cliente de Supabase para Server Components y Server Actions (lee y escribe la sesión en cookies).
export async function crearClienteServidor() {
  const almacen = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return almacen.getAll()
        },
        setAll(porGuardar) {
          try {
            porGuardar.forEach(({ name, value, options }) => almacen.set(name, value, options))
          } catch {
            // Desde un Server Component no se pueden escribir cookies; el proxy ya renueva la sesión.
          }
        },
      },
    }
  )
}
