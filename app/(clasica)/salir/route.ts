import { NextResponse, type NextRequest } from "next/server"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

// Cierra una sesión que quedó sin cuenta (p. ej. la cuenta se borró al recrear la base). Sin esto, proxy.ts
// (sesión válida → /inicio) y las páginas (sin perfil → la portada) se redirigen entre sí sin fin.
export async function GET(request: NextRequest) {
  const supabase = await crearClienteServidor()
  // "local": solo borra las cookies; el usuario puede ya no existir en el servidor
  await supabase.auth.signOut({ scope: "local" })
  const destino = request.nextUrl.searchParams.get("a") === "admin" ? "/admin/entrar" : "/"
  return NextResponse.redirect(new URL(destino, request.url))
}
