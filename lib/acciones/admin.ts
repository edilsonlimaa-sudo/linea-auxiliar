"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { APARATO_ADMIN, correoDeAdmin } from "@/lib/admin"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

const entradaAdmin = z.object({
  usuario: z.string().trim().min(1, "Escribe tu usuario"),
  clave: z.string().min(1, "Escribe tu contraseña"),
})

// Contraseñas comunes o por defecto que no se aceptan al cambiarla
const CLAVES_PROHIBIDAS = ["admin123", "admin1234", "admin12345", "12345678", "123456789", "password", "contraseña"]

const nuevaClave = z
  .object({
    clave: z
      .string()
      .min(8, "Usa al menos 8 caracteres")
      .max(72, "Es demasiado larga")
      .refine((c) => !CLAVES_PROHIBIDAS.includes(c.toLowerCase()), "Esa contraseña es muy fácil de adivinar"),
    claveConfirmada: z.string(),
  })
  .refine((d) => d.clave === d.claveConfirmada, { path: ["claveConfirmada"], message: "Las dos contraseñas no coinciden" })

function erroresDe(error: z.ZodError) {
  const errores: Record<string, string> = {}
  for (const issue of error.issues) errores[String(issue.path[0] ?? "general")] ??= issue.message
  return errores
}

/** Entrada del panel: solo cuentas admin. Si entra una de pasajero o chofer, se cierra la sesión. */
export async function entrarAdmin(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const intento = (anterior.intento ?? 0) + 1
  const valores = { usuario: String(formData.get("usuario") ?? "") }
  const resultado = entradaAdmin.safeParse(Object.fromEntries(formData))
  if (!resultado.success) return { errores: erroresDe(resultado.error), valores, intento }

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correoDeAdmin(resultado.data.usuario),
    password: resultado.data.clave,
  })
  if (error) {
    if (error.code === "invalid_credentials") return { error: "El usuario o la contraseña no son correctos.", valores, intento }
    return { error: "No pudimos entrar. Revisa tu conexión e intenta de nuevo.", valores, intento }
  }

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", data.user.id).single()
  if (perfil?.rol !== "admin") {
    await supabase.auth.signOut()
    return { error: "Esta cuenta no tiene acceso de administración.", valores, intento }
  }
  // Marca el aparato: la portada le muestra el enlace "Entrar como administrador" (§8)
  ;(await cookies()).set(APARATO_ADMIN, "1", { maxAge: 60 * 60 * 24 * 365, httpOnly: true, sameSite: "lax", path: "/" })
  redirect("/admin")
}

/** Cambiar la contraseña (obligatorio la primera vez, para no quedarse con la de por defecto) */
export async function cambiarClaveAdmin(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const intento = (anterior.intento ?? 0) + 1
  const resultado = nuevaClave.safeParse(Object.fromEntries(formData))
  if (!resultado.success) return { errores: erroresDe(resultado.error), intento }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.auth.updateUser({ password: resultado.data.clave })
  if (error) {
    if (error.code === "same_password") return { errores: { clave: "Debe ser distinta a la contraseña actual" }, intento }
    return { error: "No pudimos cambiar la contraseña. Intenta de nuevo.", intento }
  }
  const { error: errorMarca } = await supabase.rpc("clave_cambiada")
  if (errorMarca) return { error: errorMarca.message, intento }
  redirect("/admin?clave=cambiada")
}

/** Aprobar o rechazar una cuenta (R2) */
export async function decidirCuenta(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  const aprobar = formData.get("decision") === "aprobar"
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("aprobar_cuenta", { p_usuario: id, p_aprobar: aprobar })
  if (error) throw new Error(error.message)
  revalidatePath("/admin", "layout")
}

export type Historial = { viajes: number; reservas: number; calificaciones: number }

/**
 * Eliminar para siempre una cuenta rechazada, con sus fotos (R2). Si tiene historial y no se pidió borrarlo
 * también, devuelve qué historial tiene para que el panel ofrezca el segundo paso.
 */
export async function eliminarCuenta(id: string, conHistorial = false): Promise<{ error?: string; historial?: Historial }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("eliminar_cuenta", { p_usuario: id, p_con_historial: conHistorial })
  if (error) {
    if (error.message.includes("historial")) {
      const { data } = await supabase.rpc("admin_historial", { p_usuario: id })
      return { historial: data?.[0] ?? { viajes: 0, reservas: 0, calificaciones: 0 } }
    }
    return { error: "No pudimos eliminar la cuenta. Intenta de nuevo." }
  }

  // Las fotos viven en la carpeta <id>/ del bucket; si fallan, la cuenta igual quedó eliminada
  const { data: archivos } = await supabase.storage.from("fotos").list(id)
  if (archivos?.length) await supabase.storage.from("fotos").remove(archivos.map((a) => `${id}/${a.name}`))

  revalidatePath("/admin", "layout")
  return {}
}

export async function salirAdmin() {
  const supabase = await crearClienteServidor()
  await supabase.auth.signOut()
  redirect("/admin/entrar")
}

/** Cerrar un viaje desde Viajes en curso (R69): sin salir se cancela; en ruta se termina */
export async function cerrarViajeAdmin(viajeId: string): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_cerrar_viaje", { p_viaje: viajeId })
  if (error) return { error: error.message }
  revalidatePath("/", "layout")
  return {}
}

/** Desconectar a un chofer (R69): cierra todos sus viajes abiertos y queda "terminó por hoy" */
export async function desconectarChoferAdmin(choferId: string): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_desconectar", { p_chofer: choferId })
  if (error) return { error: error.message }
  revalidatePath("/", "layout")
  return {}
}
