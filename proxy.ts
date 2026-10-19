import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Rutas que se ven sin sesión. Todo lo demás exige haber entrado.
const RUTAS_PUBLICAS = ["/", "/entrar", "/registro", "/admin/entrar", "/salir"]
// Con sesión no tiene sentido volver a estas: se va directo a la app.
const RUTAS_SOLO_SIN_SESION = ["/", "/entrar", "/registro"]

const coincide = (ruta: string, lista: string[]) =>
  lista.some((r) => ruta === r || (r !== "/" && ruta.startsWith(`${r}/`)))

// Renueva la sesión de Supabase en cada petición y hace la redirección optimista por sesión.
// La revisión del estado de la cuenta (pendiente/aprobada) se hace en las páginas, contra la base.
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(porGuardar, cabeceras) {
          porGuardar.forEach(({ name, value }) => request.cookies.set(name, value))
          respuesta = NextResponse.next({ request })
          porGuardar.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options))
          Object.entries(cabeceras).forEach(([clave, valor]) => respuesta.headers.set(clave, valor))
        },
      },
    }
  )

  // getClaims valida el token (no confiar en la cookie sin verificar)
  const { data } = await supabase.auth.getClaims()
  const conSesion = Boolean(data?.claims?.sub)
  const ruta = request.nextUrl.pathname

  const esAdmin = coincide(ruta, ["/admin"])

  if (!conSesion && !coincide(ruta, RUTAS_PUBLICAS)) {
    // El panel tiene su propia entrada (usuario + contraseña), separada de la de teléfono + PIN
    return redirigir(request, respuesta, esAdmin ? "/admin/entrar" : "/")
  }
  if (conSesion && coincide(ruta, RUTAS_SOLO_SIN_SESION)) {
    return redirigir(request, respuesta, "/inicio")
  }
  if (conSesion && ruta === "/admin/entrar") {
    // Si quien tiene la sesión no es admin, /admin lo devuelve a su inicio
    return redirigir(request, respuesta, "/admin")
  }
  return respuesta
}

// Redirige conservando las cookies de sesión recién renovadas
function redirigir(request: NextRequest, respuesta: NextResponse, destino: string) {
  const redireccion = NextResponse.redirect(new URL(destino, request.url))
  respuesta.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie))
  return redireccion
}

export const config = {
  matcher: [
    // Todo menos archivos estáticos e imágenes
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
}
