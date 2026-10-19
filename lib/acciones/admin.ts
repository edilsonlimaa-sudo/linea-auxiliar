"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { correoDeAdmin } from "@/lib/admin"
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
  revalidatePath("/admin")
}

/** Eliminar para siempre una cuenta rechazada, con sus fotos (R2). Devuelve el error para mostrarlo en el panel. */
export async function eliminarCuenta(id: string): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("eliminar_cuenta", { p_usuario: id })
  if (error) {
    if (error.message.includes("historial")) {
      return { error: "No se puede eliminar: esta cuenta tiene viajes en el historial. Queda rechazada y no puede usar la app." }
    }
    return { error: "No pudimos eliminar la cuenta. Intenta de nuevo." }
  }

  // Las fotos viven en la carpeta <id>/ del bucket; si fallan, la cuenta igual quedó eliminada
  const { data: archivos } = await supabase.storage.from("fotos").list(id)
  if (archivos?.length) await supabase.storage.from("fotos").remove(archivos.map((a) => `${id}/${a.name}`))

  revalidatePath("/admin")
  return {}
}

export async function salirAdmin() {
  const supabase = await crearClienteServidor()
  await supabase.auth.signOut()
  redirect("/admin/entrar")
}
