// Sugerencias y opinión sobre la app (docs/especificacion.md §5.20, R81–R82)
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

/** R82: ¿se le pide "¿Qué tal la app?" a esta persona? (lo decide la base: viajes hechos y si opinó hace poco) */
export async function puedeValorarApp(): Promise<boolean> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc("puede_valorar_app")
  return data === true
}

export type SugerenciaAdmin = {
  id: string
  texto: string | null
  estrellas: number | null
  creadaEn: string
  leida: boolean
  autorId: string
  autor: string
  rol: "pasajero" | "chofer" | "admin"
  fotoUrl: string | null
}

/** Panel "Sugerencias" (R81): las no leídas primero, la más nueva arriba */
export async function cargarSugerenciasAdmin(): Promise<SugerenciaAdmin[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("sugerencias")
    .select("id, texto, estrellas, creada_en, leida_en, autor_id, autor:perfiles!sugerencias_autor_id_fkey(nombre, rol, foto_path)")
    .order("creada_en", { ascending: false })
    .limit(200)
  const filas = data ?? []
  const fotos = await firmarFotos(filas.map((s) => s.autor?.foto_path))
  return filas
    .map((s) => ({
      id: s.id,
      texto: s.texto,
      estrellas: s.estrellas,
      creadaEn: s.creada_en,
      leida: s.leida_en !== null,
      autorId: s.autor_id,
      autor: s.autor?.nombre ?? "Usuario",
      rol: s.autor?.rol ?? "pasajero",
      fotoUrl: s.autor?.foto_path ? (fotos.get(s.autor.foto_path) ?? null) : null,
    }))
    .sort((a, b) => Number(a.leida) - Number(b.leida))
}

/** Cuántas sugerencias sin leer, para el menú del panel */
export async function contarSugerenciasSinLeer(): Promise<number> {
  const supabase = await crearClienteServidor()
  const { count } = await supabase.from("sugerencias").select("id", { count: "exact", head: true }).is("leida_en", null)
  return count ?? 0
}
