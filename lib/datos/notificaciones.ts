// Notificaciones (docs/especificacion.md §5.23, R88–R89): las de cada pasajero y las que mandó el admin
import type { Database } from "@/lib/database.types"
import { fechaHora } from "@/lib/fechas"
import type { TipoNotificacion } from "@/lib/notificaciones"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export type MiNotificacion = { id: string; tipo: TipoNotificacion; titulo: string; texto: string; creadaEn: string; leida: boolean }
// `cuando` ya formateada en el servidor: el navegador formatea la hora con otros espacios y React avisa que no coincide
export type NotificacionEnviada = Database["public"]["Functions"]["admin_notificaciones"]["Returns"][number] & { cuando: string }

/** R89: las de una persona, la más nueva primero (las retiradas no llegan: RLS) */
export async function cargarMisNotificaciones(personaId: string): Promise<MiNotificacion[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("notificacion_destinos")
    .select("leida_en, notificacion:notificaciones!inner(id, tipo, titulo, texto, creada_en)")
    .eq("persona_id", personaId)
  return (data ?? [])
    .map(({ leida_en, notificacion: n }) => ({
      id: n.id,
      tipo: n.tipo as TipoNotificacion,
      titulo: n.titulo,
      texto: n.texto,
      creadaEn: n.creada_en,
      leida: leida_en !== null,
    }))
    .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
}

/** R89: cuántas tiene sin leer (el número de la campana) */
export async function contarNoLeidas(personaId: string): Promise<number> {
  const supabase = await crearClienteServidor()
  const { count } = await supabase
    .from("notificacion_destinos")
    .select("notificacion_id, notificaciones!inner(id)", { count: "exact", head: true })
    .eq("persona_id", personaId)
    .is("leida_en", null)
  return count ?? 0
}

/** Panel: las enviadas, con a cuántos llegó y cuántos la vieron */
export async function cargarEnviadas(): Promise<{ enviadas: NotificacionEnviada[]; error: string | null }> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("admin_notificaciones")
  return { enviadas: (data ?? []).map((n) => ({ ...n, cuando: fechaHora(n.creada_en) })), error: error?.message ?? null }
}
