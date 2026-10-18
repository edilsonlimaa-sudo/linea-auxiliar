import "server-only"

import type { Database } from "@/lib/database.types"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { ACTIVOS, type Viaje } from "@/lib/viajes"

type Tablas = Database["public"]["Tables"]
export type Reserva = Tablas["reservas"]["Row"]
export type Espera = Tablas["esperas"]["Row"]
export type Vehiculo = Pick<Tablas["vehiculos"]["Row"], "unidad" | "placa" | "modelo" | "color" | "foto_path">
export type FilaLista = Database["public"]["Functions"]["lista_viaje"]["Returns"][number]

export type Chofer = {
  id: string
  nombre: string
  foto_path: string | null
  vehiculo: Vehiculo | null
  estrellas: number | null // promedio
  calificaciones: number
}

export type ViajeConChofer = Viaje & { chofer: Chofer }

export type MiReserva = {
  reserva: Reserva
  viaje: ViajeConChofer
  posicion: number
  lista: FilaLista[]
  telefonoChofer: string | null
}

export type DatosInicioPasajero = {
  viajes: ViajeConChofer[]
  porId: Map<string, Viaje>
  miReserva: MiReserva | null
  miEspera: Espera | null
  lugaresRecientes: string[] // R25
  aviso: { texto: string; creado_en: string } | null
  unidadesEnServicio: number
}

// Inicio del día en America/Caracas (UTC-4, sin horario de verano) para el aviso del día (R47)
function inicioDelDiaCaracas(): string {
  const ahora = new Date(Date.now() - 4 * 3_600_000)
  return new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate(), 4)).toISOString()
}

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>

/**
 * Reserva del viaje en curso (docs/especificacion.md §8): activa (esperando el carro) o a bordo de un carro en
 * ruta. "subio" en un viaje abierto solo puede ser en ruta; en uno finalizado ya no cuenta.
 */
function consultarReservaEnCurso(supabase: Cliente, pasajeroId: string) {
  return supabase
    .from("reservas")
    .select("*, viaje:viajes!inner(estado)")
    .eq("pasajero_id", pasajeroId)
    .in("estado", ["activa", "subio"])
    .in("viaje.estado", ACTIVOS)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle()
}

export type CalificacionPendiente = { reservaId: string; viajeId: string; choferId: string; chofer: string; sentido: Viaje["sentido"] }

/**
 * Viaje por calificar (R45): terminado hace menos de 12 h, sin calificar ni "Ahora no". Para el pasajero, su
 * viaje termina cuando el chofer termina el viaje **o** cuando marca que se bajó (R38), aunque el carro siga.
 */
export async function cargarCalificacionPendiente(pasajeroId: string): Promise<CalificacionPendiente | null> {
  const supabase = await crearClienteServidor()
  const hace12h = new Date(Date.now() - 12 * 3_600_000).toISOString()
  const campos = "id, viaje_id, cerrada_en, viaje:viajes!inner(estado, llegada_en, sentido, chofer_id, chofer:perfiles!viajes_chofer_id_fkey(nombre))"
  const [seBajo, llego] = await Promise.all([
    // El chofer marcó "Se bajó": termina en ese momento (cerrada_en)
    supabase
      .from("reservas")
      .select(campos)
      .eq("pasajero_id", pasajeroId)
      .eq("estado", "bajo")
      .eq("calificacion_omitida", false)
      .gt("cerrada_en", hace12h)
      .order("cerrada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Llegó con el carro hasta el final
    supabase
      .from("reservas")
      .select(campos)
      .eq("pasajero_id", pasajeroId)
      .eq("estado", "subio")
      .eq("calificacion_omitida", false)
      .eq("viaje.estado", "finalizado")
      .gt("viaje.llegada_en", hace12h)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  // Si hay de los dos, el que terminó más recientemente
  const finDe = (r: NonNullable<typeof seBajo.data>) => (r.cerrada_en ?? r.viaje.llegada_en ?? "")
  const candidatos = [seBajo.data, llego.data].filter((r) => r !== null).sort((a, b) => finDe(b).localeCompare(finDe(a)))
  const data = candidatos[0]
  if (!data) return null
  const { count } = await supabase
    .from("calificaciones")
    .select("id", { count: "exact", head: true })
    .eq("viaje_id", data.viaje_id)
    .eq("pasajero_id", pasajeroId)
  if (count) return null
  return {
    reservaId: data.id,
    viajeId: data.viaje_id,
    choferId: data.viaje.chofer_id,
    chofer: data.viaje.chofer?.nombre ?? "tu chofer",
    sentido: data.viaje.sentido,
  }
}

/** ¿Tiene un viaje en curso o por calificar? Decide si el menú muestra "Mi viaje" e Inicio lo lleva allá. */
export async function tieneViajeEnCurso(pasajeroId: string): Promise<boolean> {
  const supabase = await crearClienteServidor()
  const { data } = await consultarReservaEnCurso(supabase, pasajeroId)
  return data !== null || (await cargarCalificacionPendiente(pasajeroId)) !== null
}

export type AvisoDeCierre = { reservaId: string; motivo: "salio_lleno" | "cancelo" | "rechazo" | "no_llego"; chofer: string }

/** Si en los últimos 30 min otro cerró su reserva, se le explica qué pasó (R14, R21, R24, R29) */
export async function cargarAvisoDeCierre(pasajeroId: string): Promise<AvisoDeCierre | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("reservas")
    .select("id, estado, viaje:viajes!inner(estado, chofer:perfiles!viajes_chofer_id_fkey(nombre))")
    .eq("pasajero_id", pasajeroId)
    .in("estado", ["sin_puesto", "rechazada", "no_llego"])
    .gt("cerrada_en", new Date(Date.now() - 30 * 60_000).toISOString())
    .order("cerrada_en", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const motivo =
    data.estado === "rechazada" ? "rechazo" : data.estado === "no_llego" ? "no_llego" : data.viaje.estado === "cancelado" ? "cancelo" : "salio_lleno"
  return { reservaId: data.id, motivo, chofer: data.viaje.chofer?.nombre ?? "El chofer" }
}

export async function cargarInicioPasajero(pasajeroId: string): Promise<DatosInicioPasajero> {
  const supabase = await crearClienteServidor()

  const [viajesRes, reservaRes, esperaRes, recientesRes, avisoRes, enServicioRes] = await Promise.all([
    supabase
      .from("viajes")
      .select("*, chofer:perfiles!viajes_chofer_id_fkey(id, nombre, foto_path, vehiculo:vehiculos(unidad, placa, modelo, color, foto_path))")
      .in("estado", ACTIVOS),
    consultarReservaEnCurso(supabase, pasajeroId),
    supabase
      .from("esperas")
      .select("*")
      .eq("pasajero_id", pasajeroId)
      .eq("estado", "esperando")
      .gt("creado_en", new Date(Date.now() - 2 * 3_600_000).toISOString())
      .maybeSingle(),
    supabase.rpc("mis_lugares_recientes"),
    supabase
      .from("avisos")
      .select("texto, creado_en")
      .gte("creado_en", inicioDelDiaCaracas())
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("perfiles")
      .select("id", { count: "exact", head: true })
      .eq("rol", "chofer")
      .not("conectado_en", "is", null),
  ])

  // Reputación de los choferes que aparecen (R46)
  const filas = viajesRes.data ?? []
  const idsChoferes = [...new Set(filas.map((v) => v.chofer_id))]
  const { data: califs } = idsChoferes.length
    ? await supabase.from("calificaciones").select("chofer_id, estrellas").in("chofer_id", idsChoferes)
    : { data: [] as { chofer_id: string; estrellas: number }[] }
  const reputacion = new Map<string, { suma: number; n: number }>()
  for (const c of califs ?? []) {
    const r = reputacion.get(c.chofer_id) ?? { suma: 0, n: 0 }
    reputacion.set(c.chofer_id, { suma: r.suma + c.estrellas, n: r.n + 1 })
  }

  const viajes: ViajeConChofer[] = filas.map(({ chofer, ...v }) => {
    const r = reputacion.get(v.chofer_id)
    // vehiculos tiene chofer_id único: puede venir como objeto o como lista de uno
    const vehiculo = Array.isArray(chofer?.vehiculo) ? (chofer.vehiculo[0] ?? null) : (chofer?.vehiculo ?? null)
    return {
      ...v,
      chofer: {
        id: v.chofer_id,
        nombre: chofer?.nombre ?? "Chofer",
        foto_path: chofer?.foto_path ?? null,
        vehiculo,
        estrellas: r ? r.suma / r.n : null,
        calificaciones: r?.n ?? 0,
      },
    }
  })
  const porId = new Map<string, Viaje>(viajes.map((v) => [v.id, v]))

  // Mi reserva: posición en la lista (lista pública, sin teléfonos ni ubicaciones) y teléfono del chofer
  let miReserva: MiReserva | null = null
  // El estado del viaje solo servía para filtrar; la reserva va sin él
  let reserva: Reserva | null = null
  if (reservaRes.data) {
    const { viaje, ...r } = reservaRes.data
    void viaje
    reserva = r
  }
  const viajeReservado = reserva ? viajes.find((v) => v.id === reserva.viaje_id) : undefined
  if (reserva && viajeReservado) {
    const [listaRes, telRes] = await Promise.all([
      supabase.rpc("lista_viaje", { p_viaje: reserva.viaje_id }),
      supabase.from("perfiles_privados").select("telefono").eq("id", viajeReservado.chofer_id).maybeSingle(),
    ])
    const lista = listaRes.data ?? []
    miReserva = {
      reserva,
      viaje: viajeReservado,
      lista,
      posicion: lista.find((f) => f.es_mio)?.posicion ?? 0,
      telefonoChofer: telRes.data?.telefono ?? null,
    }
  }

  return {
    viajes,
    porId,
    miReserva,
    miEspera: esperaRes.data ?? null,
    lugaresRecientes: (recientesRes.data ?? []).map((f) => f.lugar),
    aviso: avisoRes.data ?? null,
    unidadesEnServicio: enServicioRes.count ?? 0,
  }
}
