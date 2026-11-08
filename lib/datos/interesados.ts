import "server-only"

import type { Database } from "@/lib/database.types"
import type { RutaNueva } from "@/lib/rutas-nuevas"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export type Interesado = Database["public"]["Tables"]["interesados"]["Row"]

/** R97: los interesados en una ruta nueva (solo el admin; la función lo exige) */
export async function cargarInteresados(ruta: RutaNueva): Promise<{ interesados: Interesado[]; error: string | null }> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("admin_interesados", { p_ruta: ruta })
  return { interesados: data ?? [], error: error?.message ?? null }
}
