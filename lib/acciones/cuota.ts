"use server"

import { revalidatePath } from "next/cache"

import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { BANCOS, leerPagoMovil } from "@/lib/bancos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/** R77: el chofer avisa el Pago Móvil de la cuota del día (referencia + banco desde el que pagó) */
export async function avisarPagoCuota(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const intento = (anterior.intento ?? 0) + 1
  const valores = { referencia: String(formData.get("referencia") ?? ""), banco: String(formData.get("banco") ?? "") }
  const referencia = valores.referencia.replace(/\D/g, "")
  const errores: Record<string, string> = {}
  if (!/^\d{4,20}$/.test(referencia)) errores.referencia = "Escribe la referencia del Pago Móvil (solo números)"
  if (!BANCOS[valores.banco]) errores.banco = "Escoge el banco desde el que pagaste"
  if (Object.keys(errores).length) return { errores, valores, intento }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("avisar_pago_cuota", { p_referencia: referencia, p_banco: valores.banco })
  if (error) return { error: error.message, valores, intento }
  revalidatePath("/inicio")
  // La página muestra el aviso enviado (en revisión: "Ir a publicar")
  revalidatePath("/cuota")
  revalidatePath("/n/chofer", "layout") // la interfaz nueva del chofer (§5.21)
  return { intento }
}

/** R78: el admin aprueba o rechaza un aviso (con motivo opcional al rechazar) */
export async function decidirPagoCuota(pagoId: string, aprobar: boolean, motivo?: string): Promise<{ error?: string }> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_decidir_pago", { p_pago: pagoId, p_aprobar: aprobar, p_motivo: motivo?.trim() || undefined })
  if (error) return { error: error.message }
  revalidatePath("/admin", "layout")
  return {}
}

/** R78: los datos del cobro (activa, desde, monto y el Pago Móvil de la línea) */
export async function guardarCuota(anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const intento = (anterior.intento ?? 0) + 1
  const valores = Object.fromEntries(["activa", "desde", "monto", "pmBanco", "pmTelefono", "pmCedula"].map((c) => [c, String(formData.get(c) ?? "")]))
  const activa = valores.activa === "si"
  const monto = Number(valores.monto.replace(/\./g, "").replace(",", "."))
  const errores: Record<string, string> = {}
  if (!Number.isFinite(monto) || monto <= 0) errores.monto = "Escribe el monto de la cuota"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valores.desde)) errores.desde = "Escoge desde qué día se cobra"
  // El Pago Móvil es opcional mientras la cuota está apagada; para activarla, completo
  const { datos, errores: erroresPm } = leerPagoMovil(Object.fromEntries(formData), !activa)
  Object.assign(errores, erroresPm)
  if (Object.keys(errores).length) return { errores, valores, intento }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("admin_guardar_cuota", {
    p_activa: activa,
    p_desde: valores.desde,
    p_monto: monto,
    p_banco: datos?.banco ?? "",
    p_telefono: datos?.telefono ?? "",
    p_cedula: datos?.cedula ?? "",
  })
  if (error) return { error: error.message, valores, intento }
  revalidatePath("/admin", "layout")
  return { valores: { ...valores, guardado: "si" }, intento }
}
