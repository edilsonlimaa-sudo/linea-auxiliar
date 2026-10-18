import "server-only"

import type { Database } from "@/lib/database.types"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { ACTIVOS, nombreCorto, type Sentido, type Viaje } from "@/lib/viajes"

type Reserva = Database["public"]["Tables"]["reservas"]["Row"]

/** Una persona en la lista del carro, como la ve el chofer (con lugar, GPS y teléfono, §6) */
export type FilaChofer = {
  id: string
  posicion: number // 1 = primero (R17)
  confirmado: boolean // tiene puesto (posición ≤ puestos)
  nombre: string // nombre corto ("Carmen R.") o el que puso el chofer
  conApp: boolean // false: anotado a mano (R36)
  estado: Reserva["estado"] // activa | subio
  lugar: string | null
  lat: number | null
  lng: number | null
  listo: boolean // "✋ Ya está en el sitio" (R23)
  pendiente: boolean // pedido en el camino sin responder (R29)
  aceptada: boolean
  telefono: string | null
}

export type ViajeChofer = Viaje & { lista: FilaChofer[] }

export type DatosInicioChofer = {
  conectado: boolean
  enRuta: ViajeChofer | null // va hacia el destino con gente a bordo
  recogida: ViajeChofer | null // recogida actual: en camino, llegando o recogiendo
  proximos: ViajeChofer[] // encadenados (programado)
  esperando: Record<Sentido, number> // demanda por sentido (R10, R31)
  ultimo: { sentido: Sentido; puestos: number } | null // último viaje no cancelado, para sugerir al publicar
  vehiculo: { unidad: string | null; placa: string } | null
}

export async function cargarInicioChofer(choferId: string, conectado: boolean): Promise<DatosInicioChofer> {
  const supabase = await crearClienteServidor()

  const [viajesRes, esperasRes, ultimoRes, vehiculoRes] = await Promise.all([
    supabase.from("viajes").select("*").eq("chofer_id", choferId).in("estado", ACTIVOS).order("creado_en"),
    supabase.rpc("demanda_por_sentido"), // solo cuántos esperan, no quién ni dónde (R31)
    supabase.from("viajes").select("sentido, puestos").eq("chofer_id", choferId).neq("estado", "cancelado").order("creado_en", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("vehiculos").select("unidad, placa").eq("chofer_id", choferId).maybeSingle(),
  ])
  const viajes = viajesRes.data ?? []

  // Listas de todos sus viajes abiertos. El chofer lee las reservas de sus viajes con lugar y GPS (RLS).
  const ids = viajes.map((v) => v.id)
  const { data: reservas } = ids.length
    ? await supabase
        .from("reservas")
        .select("*, pasajero:perfiles!reservas_pasajero_id_fkey(nombre)")
        .in("viaje_id", ids)
        .in("estado", ["activa", "subio"])
        .order("creado_en")
        .order("id")
    : { data: [] }
  const filas = reservas ?? []

  const idsPasajeros = [...new Set(filas.map((r) => r.pasajero_id).filter((id): id is string => id !== null))]
  const { data: telefonos } = idsPasajeros.length
    ? await supabase.from("perfiles_privados").select("id, telefono").in("id", idsPasajeros)
    : { data: [] }
  const telefonoDe = new Map((telefonos ?? []).map((t) => [t.id, t.telefono]))

  const conLista = (v: Viaje): ViajeChofer => {
    const deEste = filas.filter((r) => r.viaje_id === v.id)
    return {
      ...v,
      lista: deEste.map((r, i) => ({
        id: r.id,
        posicion: i + 1,
        confirmado: i + 1 <= v.puestos,
        nombre: r.pasajero ? nombreCorto(r.pasajero.nombre) : (r.nombre ?? "Pasajero sin app"),
        conApp: r.pasajero_id !== null,
        estado: r.estado,
        lugar: r.lugar,
        lat: r.lat,
        lng: r.lng,
        listo: r.listo,
        pendiente: r.pendiente,
        aceptada: r.aceptada_en !== null,
        telefono: r.pasajero_id ? (telefonoDe.get(r.pasajero_id) ?? null) : null,
      })),
    }
  }

  const esperando: Record<Sentido, number> = { vg_a_centro: 0, centro_a_vg: 0 }
  for (const d of esperasRes.data ?? []) esperando[d.sentido] = d.esperando

  const enRuta = viajes.find((v) => v.estado === "en_ruta")
  const recogida = viajes.find((v) => v.estado === "en_camino" || v.estado === "llegando" || v.estado === "en_parada")

  return {
    conectado,
    enRuta: enRuta ? conLista(enRuta) : null,
    recogida: recogida ? conLista(recogida) : null,
    proximos: viajes.filter((v) => v.estado === "programado").map(conLista),
    esperando,
    ultimo: ultimoRes.data ?? null,
    vehiculo: vehiculoRes.data ?? null,
  }
}
