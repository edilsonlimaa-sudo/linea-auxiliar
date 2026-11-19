import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { after } from "next/server"

import type { Database } from "@/lib/database.types"
import { mandarPush, type AvisoPush } from "@/lib/push"

type Fila = Database["public"]["Functions"]["avisar_gina"]["Returns"][number]

/** Qué le dice el push a cada uno según el paso del carro y su lugar en el plan (R116) */
export function avisoDeGina(f: Pick<Fila, "estado" | "lugar" | "rol" | "donde">, quien: string, viajeId: string): AvisoPush {
  const llego = f.estado === "en_parada"
  const base = { id: `gina-${viajeId}-${f.estado}`, url: "/n/a-valle-grande" }
  if (f.rol === "llamar") {
    return {
      ...base,
      titulo: llego ? "Tu carro llegó a Gina 🚗" : "Tu carro está llegando a Gina 🚗",
      texto: `${quien} ${llego ? "ya está en Gina" : "está por llegar"}. Vas de ${f.lugar} en la lista: te toca, acércate al carro.`,
    }
  }
  if (f.rol === "guardar") {
    return {
      ...base,
      titulo: "Un carro te guarda puesto",
      texto: `${quien} ${llego ? "ya está en Gina" : "va llegando a Gina"} y te recoge al pasar${f.donde ? ` por ${f.donde}` : ""}.`,
    }
  }
  return {
    ...base,
    titulo: llego ? "Llegó un carro a Gina" : "Viene un carro a Gina",
    texto: `Vas de ${f.lugar} en la lista y esta vez no te toca. Sigue esperando en la Plaza Rómulo Gallegos.`,
  }
}

/**
 * R116: el chofer avisó que llega a Gina o que ya llegó: push a quienes esperan en la lista (la base decide a quién,
 * una vez por viaje y por paso). Sale después de responder al chofer; si falla, el viaje avanzó igual. Lo usan la Server
 * Action `avanzarViaje` (sesión de la cookie) y `/api/avisar-esperas` (token de la app nativa).
 */
export async function avisarGina(supabase: SupabaseClient<Database>, viajeId: string) {
  try {
    const { data: filas } = await supabase.rpc("avisar_gina", { p_viaje: viajeId })
    if (!filas?.length) return
    const { data: v } = await supabase
      .from("viajes")
      .select("chofer:perfiles!viajes_chofer_id_fkey(nombre, vehiculo:vehiculos(unidad))")
      .eq("id", viajeId)
      .maybeSingle()
    const chofer = Array.isArray(v?.chofer) ? v?.chofer[0] : v?.chofer
    const vehiculo = Array.isArray(chofer?.vehiculo) ? chofer?.vehiculo[0] : chofer?.vehiculo
    const quien = `${chofer?.nombre.split(" ")[0] ?? "Un chofer"}${vehiculo?.unidad ? ` (unidad ${vehiculo.unidad})` : ""}`
    // Un aviso por persona, a todos sus aparatos
    const porPersona = new Map<string, Fila[]>()
    for (const f of filas) porPersona.set(f.persona_id, [...(porPersona.get(f.persona_id) ?? []), f])
    after(() =>
      Promise.allSettled([...porPersona.values()].map((suyas) => mandarPush(suyas, avisoDeGina(suyas[0], quien, viajeId)))).then(() => {})
    )
  } catch {
    // El aviso es un extra: el viaje no depende de él
  }
}
