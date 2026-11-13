import "server-only"

import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { NAVIDAD, VENTANA_ESFERAS } from "@/lib/temporada"

/**
 * R100: cuántas esferas tiene el arbolito del pasajero. Una por puesto (R57: en grupo, una por persona) de cada reserva
 * en que se montó entre el 9/11 y el 24/12: `bajo` (se bajó) o `subio` en un viaje ya terminado. Nada nuevo en la base:
 * se cuenta de sus reservas (RLS: las suyas).
 */
export async function contarEsferas(pasajeroId: string): Promise<number> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("reservas")
    .select("estado, personas, viaje:viajes!inner(estado)")
    .eq("pasajero_id", pasajeroId)
    .in("estado", ["subio", "bajo"])
    .gte("creado_en", VENTANA_ESFERAS.desde)
    .lt("creado_en", VENTANA_ESFERAS.hasta)
  const puestos = (data ?? [])
    .filter((r) => r.estado === "bajo" || r.viaje.estado === "finalizado")
    .reduce((total, r) => total + (r.personas ?? 1), 0)
  return Math.min(puestos, NAVIDAD.esferas)
}
