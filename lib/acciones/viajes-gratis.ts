"use server"

import { revalidatePath } from "next/cache"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/** R102: el admin regala viajes gratis a un pasajero (1 a 10, con el motivo) */
export async function regalarViajes(pasajeroId: string, cantidad: number, motivo: string): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_regalar_viajes", { p_pasajero: pasajeroId, p_cantidad: cantidad, p_motivo: motivo })
  if (error) return { error: error.message }
  revalidatePath(`/admin/pasajeros/${pasajeroId}`)
  return {}
}

/** R102: quitar un regalo mal puesto (la base no deja si ya se usó) */
export async function quitarRegalo(pasajeroId: string, regaloId: string): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_quitar_regalo", { p_regalo: regaloId })
  if (error) return { error: error.message }
  revalidatePath(`/admin/pasajeros/${pasajeroId}`)
  return {}
}
