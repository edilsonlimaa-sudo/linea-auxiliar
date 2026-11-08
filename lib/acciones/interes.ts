"use server"

import { FRECUENCIAS, HORARIOS, RUTAS_NUEVAS } from "@/lib/rutas-nuevas"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { telefonoValido } from "@/lib/telefono"

export type EstadoInteres = {
  ok?: boolean
  error?: string
  errores?: Record<string, string>
  valores?: Record<string, string | string[]>
  intento?: number
}

const texto = (fd: FormData, campo: string) => String(fd.get(campo) ?? "").trim()

/**
 * R96: "Me interesa la ruta" sin cuenta. Valida aquí para mostrar los errores por campo; la base vuelve a validar todo
 * (registrar_interes) y no deja duplicar el mismo teléfono en la misma ruta.
 */
export async function registrarInteres(anterior: EstadoInteres, fd: FormData): Promise<EstadoInteres> {
  const intento = (anterior.intento ?? 0) + 1
  // Campo trampa: invisible para las personas; si viene lleno, es un robot. Se le responde como si nada
  if (texto(fd, "sitio_web")) return { ok: true, intento }

  const ruta = texto(fd, "ruta")
  const rol = texto(fd, "rol")
  const valores = {
    rol,
    nombre: texto(fd, "nombre"),
    telefono: texto(fd, "telefono"),
    sector: texto(fd, "sector"),
    horarios: fd.getAll("horarios").map(String),
    frecuencia: texto(fd, "frecuencia"),
    carro: texto(fd, "carro"),
    comentario: texto(fd, "comentario"),
  }

  const errores: Record<string, string> = {}
  if (!(ruta in RUTAS_NUEVAS)) return { error: "Esa ruta no existe.", intento, valores }
  if (rol !== "pasajero" && rol !== "chofer") errores.rol = "Escoge si serías pasajero o chofer."
  if (valores.nombre.length < 3) errores.nombre = "Escribe tu nombre y apellido."
  if (!telefonoValido(valores.telefono)) errores.telefono = "Escribe tu número de WhatsApp, por ejemplo 0414-1234567."
  if (valores.sector.length < 2) errores.sector = "Escribe en qué microcondominio vives."
  if (valores.horarios.length === 0) errores.horarios = rol === "chofer" ? "Escoge cuándo podrías trabajar." : "Escoge cuándo viajarías."
  if (valores.comentario.length > 280) errores.comentario = "El comentario es muy largo (máximo 280 letras)."
  if (Object.keys(errores).length) return { errores, intento, valores }

  const horarios = valores.horarios.filter((h) => HORARIOS.some((x) => x.id === h))
  const frecuencia = FRECUENCIAS.some((f) => f.id === valores.frecuencia) ? valores.frecuencia : undefined

  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("registrar_interes", {
    p_ruta: ruta,
    p_rol: rol,
    p_nombre: valores.nombre,
    p_telefono: valores.telefono,
    p_sector: valores.sector,
    p_horarios: horarios,
    p_frecuencia: rol === "pasajero" ? frecuencia : undefined,
    p_carro: rol === "chofer" ? valores.carro || undefined : undefined,
    p_comentario: valores.comentario || undefined,
  })
  // Los errores de la base ya vienen en español
  if (error) return { error: error.message || "No se pudo enviar. Intenta de nuevo.", intento, valores }
  return { ok: true, intento }
}
