"use server"

import { revalidatePath } from "next/cache"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/** R83: el admin pasa una o varias cuentas a la interfaz nueva o las devuelve a la clásica */
export async function cambiarInterfaz(ids: string[], interfaz: "clasica" | "nueva"): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_cambiar_interfaz", { p_ids: ids, p_interfaz: interfaz })
  if (error) return { error: error.message }
  revalidatePath("/admin", "layout")
  return {}
}

/**
 * R83 en grupo: pasa a todos los pasajeros aprobados a la nueva (el lanzamiento) o los devuelve a la clásica (por si
 * algo sale mal ese día). Devuelve cuántos cambiaron
 */
export async function cambiarInterfazDeTodos(interfaz: "clasica" | "nueva"): Promise<{ error?: string; cambiados?: number }> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.from("perfiles").select("id").eq("rol", "pasajero").eq("estado", "aprobado").neq("interfaz", interfaz)
  if (error) return { error: error.message }
  const ids = (data ?? []).map((p) => p.id)
  if (ids.length === 0) return { cambiados: 0 }
  const { data: cambiados, error: e } = await supabase.rpc("admin_cambiar_interfaz", { p_ids: ids, p_interfaz: interfaz })
  if (e) return { error: e.message }
  revalidatePath("/admin", "layout")
  return { cambiados: cambiados ?? 0 }
}
