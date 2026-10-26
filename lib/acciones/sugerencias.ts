"use server"

import { revalidatePath } from "next/cache"

import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/** R81: enviar una sugerencia al admin (pasajeros y choferes) */
export async function enviarSugerencia(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const intento = (anterior.intento ?? 0) + 1
  const texto = String(formData.get("texto") ?? "").trim()
  if (!texto) return { errores: { texto: "Escribe tu sugerencia" }, valores: { texto }, intento }
  if (texto.length > 1000) return { errores: { texto: "Es muy larga (máximo 1.000 letras)" }, valores: { texto }, intento }
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("enviar_sugerencia", { p_texto: texto })
  if (error) return { error: error.message, valores: { texto }, intento }
  revalidatePath("/admin", "layout")
  return { valores: { enviada: "si" }, intento }
}

/** R82: "¿Qué tal la app?" (estrellas y comentario opcional) */
export async function valorarApp(estrellas: number, comentario: string): Promise<{ error?: string }> {
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) return { error: "Toca las estrellas" }
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("valorar_app", { p_estrellas: estrellas, p_comentario: comentario.trim() || undefined })
  if (error) return { error: error.message }
  revalidatePath("/admin", "layout")
  return {}
}

/** R81: el admin marca una sugerencia leída (o no leída) */
export async function marcarSugerencia(id: string, leida: boolean): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_marcar_sugerencia", { p_id: id, p_leida: leida })
  if (error) return { error: error.message }
  revalidatePath("/admin", "layout")
  return {}
}
