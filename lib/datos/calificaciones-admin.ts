import "server-only"

import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import type { Viaje } from "@/lib/viajes"

/** Una calificación como la ve el admin: con quién calificó (§8, a diferencia del chofer, R52) */
export type CalificacionAdmin = {
  id: string
  estrellas: number
  etiquetas: string[]
  comentario: string | null
  creadaEn: string
  sentido: Viaje["sentido"] | null
  chofer: { id: string; nombre: string; fotoUrl: string | null }
  pasajero: { nombre: string; fotoUrl: string | null }
}

/** Las calificaciones desde `desde` (todas si es null), la más reciente primero (máx. 1000) */
export async function cargarCalificacionesAdmin(desde: Date | null): Promise<CalificacionAdmin[]> {
  const supabase = await crearClienteServidor()
  let consulta = supabase
    .from("calificaciones")
    .select(
      "id, estrellas, etiquetas, comentario, creado_en, chofer_id, viaje:viajes(sentido), chofer:perfiles!calificaciones_chofer_id_fkey(nombre, foto_path), pasajero:perfiles!calificaciones_pasajero_id_fkey(nombre, foto_path)"
    )
    .order("creado_en", { ascending: false })
    .limit(1000)
  if (desde) consulta = consulta.gte("creado_en", desde.toISOString())
  const { data } = await consulta
  const filas = data ?? []
  const fotos = await firmarFotos(filas.flatMap((c) => [c.chofer?.foto_path, c.pasajero?.foto_path]))
  const foto = (ruta: string | null | undefined) => (ruta ? (fotos.get(ruta) ?? null) : null)

  return filas.map((c) => ({
    id: c.id,
    estrellas: c.estrellas,
    etiquetas: c.etiquetas,
    comentario: c.comentario,
    creadaEn: c.creado_en,
    sentido: c.viaje?.sentido ?? null,
    chofer: { id: c.chofer_id, nombre: c.chofer?.nombre ?? "Chofer", fotoUrl: foto(c.chofer?.foto_path) },
    pasajero: { nombre: c.pasajero?.nombre ?? "Cuenta eliminada", fotoUrl: foto(c.pasajero?.foto_path) },
  }))
}
