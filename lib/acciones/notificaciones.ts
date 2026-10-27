"use server"

import { revalidatePath } from "next/cache"

import type { TipoNotificacion } from "@/lib/notificaciones"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/** R88: el admin manda una notificación; `ids` null = todos los pasajeros de la interfaz nueva */
export async function enviarNotificacion(datos: {
  tipo: TipoNotificacion
  titulo: string
  texto: string
  ids: string[] | null
}): Promise<{ error?: string; enviadas?: number }> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("admin_enviar_notificacion", {
    p_tipo: datos.tipo,
    p_titulo: datos.titulo,
    p_texto: datos.texto,
    p_ids: datos.ids ?? undefined,
  })
  if (error) return { error: error.message }
  revalidatePath("/admin/notificaciones")
  return { enviadas: data ?? 0 }
}

/** R88: retirarla (desaparece para todos) */
export async function retirarNotificacion(id: string): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_retirar_notificacion", { p_id: id })
  if (error) return { error: error.message }
  revalidatePath("/admin/notificaciones")
  return {}
}

/** R89: al abrir la pestaña quedan leídas todas las propias; la campana se actualiza */
export async function marcarNotificacionesLeidas(): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("marcar_notificaciones_leidas")
  if (error) return { error: error.message }
  revalidatePath("/n", "layout")
  return {}
}
