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
