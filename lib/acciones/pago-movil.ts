"use server"

import { revalidatePath } from "next/cache"

import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { leerPagoMovil } from "@/lib/bancos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/** Guardar o cambiar el Pago Móvil del chofer (R74), desde Mi carnet */
export async function guardarPagoMovil(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const intento = (anterior.intento ?? 0) + 1
  const valores = Object.fromEntries(["pmBanco", "pmTelefono", "pmCedula"].map((c) => [c, String(formData.get(c) ?? "")]))
  const { datos, errores } = leerPagoMovil(Object.fromEntries(formData), false)
  if (!datos) return { errores, valores, intento }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("guardar_pago_movil", { p_banco: datos.banco, p_telefono: datos.telefono, p_cedula: datos.cedula })
  if (error) return { error: error.message, valores, intento }
  revalidatePath("/carnet")
  revalidatePath("/n/chofer", "layout") // la interfaz nueva del chofer (§5.21)
  return { valores: { ...valores, guardado: "si" }, intento }
}

/** Quitar el Pago Móvil (R74) */
export async function quitarPagoMovil(): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("quitar_pago_movil")
  if (error) return { error: error.message }
  revalidatePath("/carnet")
  revalidatePath("/n/chofer", "layout") // la interfaz nueva del chofer (§5.21)
  return {}
}
