// La salida fija (docs/especificacion.md §5.28, R108–R109): la respuesta de cada pasajero y, para el admin, todas
import "server-only"

import type { Compromiso, HorarioSalida, RespuestaSalidaFija } from "@/lib/salida-fija"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export type RespuestaAdmin = RespuestaSalidaFija & { personaId: string; nombre: string; telefono: string | null; actualizadaEn: string }

/** R108: la propia (RLS: cada uno lee la suya), o null si no respondió */
export async function cargarMiRespuesta(personaId: string): Promise<(RespuestaSalidaFija & { actualizadaEn: string }) | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("salida_fija_respuestas")
    .select("compromiso, horario, horario_otro, dias, comentario, actualizada_en")
    .eq("persona_id", personaId)
    .maybeSingle()
  if (!data) return null
  return {
    compromiso: data.compromiso as Compromiso,
    horario: data.horario as HorarioSalida | null,
    horarioOtro: data.horario_otro,
    dias: data.dias ?? [],
    comentario: data.comentario,
    actualizadaEn: data.actualizada_en,
  }
}

/** R109: todas, la más nueva primero, con nombre y teléfono (solo el admin) */
export async function cargarRespuestasSalidaFija(): Promise<{ respuestas: RespuestaAdmin[]; error: string | null }> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("admin_salida_fija")
  return {
    respuestas: (data ?? []).map((r) => ({
      personaId: r.persona_id,
      nombre: r.nombre,
      telefono: r.telefono,
      compromiso: r.compromiso as Compromiso,
      horario: r.horario as HorarioSalida | null,
      horarioOtro: r.horario_otro,
      dias: r.dias ?? [],
      comentario: r.comentario,
      actualizadaEn: r.actualizada_en,
    })),
    error: error?.message ?? null,
  }
}
