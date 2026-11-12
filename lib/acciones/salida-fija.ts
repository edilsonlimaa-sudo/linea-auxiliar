"use server"

import { revalidatePath } from "next/cache"

import { COMPROMISOS, DIAS_SALIDA, HORARIOS_SALIDA, MAX_COMENTARIO, MAX_HORA_OTRA } from "@/lib/salida-fija"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export type EstadoSalidaFija = {
  ok?: boolean
  error?: string
  errores?: Record<string, string>
  valores?: Record<string, string | string[]>
  intento?: number
}

const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? "").trim()

/**
 * R108: responder la encuesta de la salida fija (o cambiar la respuesta). Valida aquí para mostrar los errores por campo;
 * la base vuelve a validar todo (responder_salida_fija) y guarda una sola respuesta por persona.
 */
export async function responderSalidaFija(anterior: EstadoSalidaFija, fd: FormData): Promise<EstadoSalidaFija> {
  const intento = (anterior.intento ?? 0) + 1
  const valores = {
    compromiso: texto(fd, "compromiso"),
    horario: texto(fd, "horario"),
    horario_otro: texto(fd, "horario_otro"),
    dias: fd.getAll("dias").map(String),
    comentario: texto(fd, "comentario"),
  }
  const no = valores.compromiso === "no"

  const errores: Record<string, string> = {}
  if (!COMPROMISOS.some((c) => c.id === valores.compromiso)) errores.compromiso = "Dinos si te anotamos para la prueba."
  if (!no) {
    if (!HORARIOS_SALIDA.some((h) => h.id === valores.horario)) errores.horario = "Escoge a qué hora te sirve."
    else if (valores.horario === "otra" && !valores.horario_otro) errores.horario_otro = "Escribe a qué hora te sirve."
    if (valores.horario_otro.length > MAX_HORA_OTRA) errores.horario_otro = `Escríbela más corta (máximo ${MAX_HORA_OTRA} letras).`
    if (!valores.dias.some((d) => DIAS_SALIDA.some((x) => String(x.id) === d))) errores.dias = "Escoge al menos un día."
  }
  if (valores.comentario.length > MAX_COMENTARIO) errores.comentario = `El comentario es muy largo (máximo ${MAX_COMENTARIO} letras).`
  if (Object.keys(errores).length) return { errores, intento, valores }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("responder_salida_fija", {
    p_compromiso: valores.compromiso,
    p_horario: no ? undefined : valores.horario,
    p_horario_otro: !no && valores.horario === "otra" ? valores.horario_otro : undefined,
    p_dias: no ? undefined : valores.dias.map(Number),
    p_comentario: valores.comentario || undefined,
  })
  // Los errores de la base ya vienen en español
  if (error) return { error: error.message || "No se pudo enviar. Intenta de nuevo.", intento, valores }
  revalidatePath("/n/salida-fija")
  revalidatePath("/admin/salida-fija")
  return { ok: true, intento }
}
