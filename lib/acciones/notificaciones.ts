"use server"

import { revalidatePath } from "next/cache"

import type { TipoNotificacion } from "@/lib/notificaciones"
import { mandarPush } from "@/lib/push"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/**
 * R88: el admin manda una notificación; `ids` null = todos los pasajeros de la interfaz nueva. R90: también llega como
 * aviso a los celulares que lo activaron. Si el aviso falla, la notificación igual queda en la pestaña.
 */
export async function enviarNotificacion(datos: {
  tipo: TipoNotificacion
  titulo: string
  texto: string
  ids: string[] | null
}): Promise<{ error?: string; enviadas?: number; celulares?: number }> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("admin_enviar_notificacion", {
    p_tipo: datos.tipo,
    p_titulo: datos.titulo,
    p_texto: datos.texto,
    p_ids: datos.ids ?? undefined,
  })
  const enviada = data?.[0]
  if (error || !enviada) return { error: error?.message ?? "No se pudo mandar" }

  let celulares = 0
  const { data: suscripciones } = await supabase.rpc("admin_suscripciones_de", { p_notificacion: enviada.id })
  if (suscripciones?.length) {
    const r = await mandarPush(suscripciones, { id: enviada.id, titulo: datos.titulo.trim(), texto: datos.texto.trim(), url: "/n/notificaciones" })
    celulares = r.enviados
    await supabase.rpc("admin_registrar_push", { p_notificacion: enviada.id, p_enviados: r.enviados, p_caducados: r.caducados })
  }
  revalidatePath("/admin/notificaciones")
  return { enviadas: enviada.destinatarios, celulares }
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

/** R90: activar los avisos en este aparato (lo que dio el navegador al suscribirse) */
export async function activarAvisosCelular(s: { endpoint: string; p256dh: string; auth: string }): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("guardar_suscripcion", { p_endpoint: s.endpoint, p_p256dh: s.p256dh, p_auth: s.auth })
  return error ? { error: error.message } : {}
}

/** R90: desactivarlos en este aparato (también al cerrar sesión) */
export async function desactivarAvisosCelular(endpoint: string): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("quitar_suscripcion", { p_endpoint: endpoint })
  return error ? { error: error.message } : {}
}
