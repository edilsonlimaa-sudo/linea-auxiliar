// Interfaz nueva (docs/especificacion.md §5.21, R83): qué interfaz tiene cada cuenta, para el panel
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export type Interfaz = "clasica" | "nueva"

/** La interfaz de una cuenta */
export async function interfazDe(id: string): Promise<Interfaz> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.from("perfiles").select("interfaz").eq("id", id).maybeSingle()
  return data?.interfaz === "nueva" ? "nueva" : "clasica"
}

export type EnLaNueva = { id: string; nombre: string; fotoUrl: string | null }

/** Quiénes de un rol ya están en la nueva (R83), por nombre */
export async function cargarEnLaNueva(rol: "pasajero" | "chofer"): Promise<EnLaNueva[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.from("perfiles").select("id, nombre, foto_path").eq("rol", rol).eq("interfaz", "nueva").order("nombre")
  const filas = data ?? []
  const fotos = await firmarFotos(filas.map((p) => p.foto_path))
  return filas.map((p) => ({ id: p.id, nombre: p.nombre, fotoUrl: p.foto_path ? (fotos.get(p.foto_path) ?? null) : null }))
}
