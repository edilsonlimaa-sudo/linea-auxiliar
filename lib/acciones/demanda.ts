"use server"

import { revalidatePath } from "next/cache"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/** R86: el admin marca o desmarca una cuenta de prueba (no cuenta en Demanda y oferta) */
export async function marcarPrueba(id: string, prueba: boolean): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_marcar_prueba", { p_id: id, p_prueba: prueba })
  if (error) return { error: error.message }
  revalidatePath("/admin", "layout")
  return {}
}

/** R92: el admin enciende o apaga la grabación del recorrido de los viajes */
export async function grabarRecorridos(grabar: boolean): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_grabar_recorridos", { p_grabar: grabar })
  if (error) return { error: error.message }
  revalidatePath("/admin/rutas")
  return {}
}
