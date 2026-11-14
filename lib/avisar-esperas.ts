import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { after } from "next/server"

import type { Database } from "@/lib/database.types"
import { hora } from "@/lib/fechas"
import { mandarPush } from "@/lib/push"

/**
 * R94: recién publicado un viaje al Centro, a quien pidió aviso le llega (una sola vez) "Hay un carro al Centro" en el
 * celular. La base marca los pedidos y devuelve los aparatos; el aviso sale después de responder al chofer. Si falla,
 * la publicación ya quedó igual. Lo usan la Server Action al publicar (con la sesión de la cookie) y
 * `/api/avisar-esperas` (con la del token de la app nativa del chofer): `supabase` es el cliente con la sesión del chofer.
 */
export async function avisarQuienEspera(supabase: SupabaseClient<Database>) {
  try {
    const { data: aparatos } = await supabase.rpc("avisar_esperas")
    if (!aparatos?.length) return
    const ids = [...new Set(aparatos.map((a) => a.viaje_id))]
    const { data: viajes } = await supabase
      .from("viajes")
      .select("id, estado, estado_en, eta_min, hora_fija, chofer:perfiles!viajes_chofer_id_fkey(nombre, vehiculo:vehiculos(unidad))")
      .in("id", ids)
    for (const v of viajes ?? []) {
      const chofer = Array.isArray(v.chofer) ? v.chofer[0] : v.chofer
      const vehiculo = Array.isArray(chofer?.vehiculo) ? chofer?.vehiculo[0] : chofer?.vehiculo
      const quien = `${chofer?.nombre.split(" ")[0] ?? "Un chofer"}${vehiculo?.unidad ? ` (unidad ${vehiculo.unidad})` : ""}`
      const cuando = v.hora_fija
        ? `a las ${hora(v.hora_fija)}`
        : v.estado === "programado"
          ? "después de su viaje de ahora"
          : v.eta_min <= 1
            ? "ya"
            : `en unos ${v.eta_min} min`
      const aviso = {
        id: `aviso-centro-${v.id}`,
        titulo: "Hay un carro al Centro",
        texto: `${quien} va al Centro y llega a recoger ${cuando}. Aparta tu puesto.`,
        url: "/n/al-centro",
      }
      const suyos = aparatos.filter((a) => a.viaje_id === v.id)
      after(() => mandarPush(suyos, aviso).catch(() => {}))
    }
  } catch {
    // El aviso es un extra: la publicación no depende de él
  }
}
