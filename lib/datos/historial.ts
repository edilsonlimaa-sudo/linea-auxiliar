import "server-only"

import type { Database } from "@/lib/database.types"
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { cargarEventos } from "@/lib/datos/admin"
import { type EventoViaje, nombreCorto, type Sentido } from "@/lib/viajes"

type Perfil = Database["public"]["Tables"]["perfiles"]["Row"]
type Vehiculo = {
  unidad: string | null
  placa: string
  modelo: string | null
  color: string | null
  foto_path?: string | null
  aire_acondicionado?: boolean
}

// vehiculos tiene chofer_id único: PostgREST puede devolverlo como objeto o como lista de uno
const unoSolo = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

// ---------------------------------------------------------------------------------------------
// Pasajero: Mis viajes (R51)
// ---------------------------------------------------------------------------------------------

export type ViajePasajero = {
  reservaId: string
  viajeId: string
  choferId: string
  chofer: string
  sentido: Sentido
  cuando: string // salida (o la reserva, si no hay salida)
  seBajoAntes: boolean
  unidad: string | null
  placa: string | null
  estrellas: number | null // su calificación; null = sin calificar
}

/** Los últimos 30 viajes que hizo de verdad: subió (viaje terminado) o se bajó (R38) */
export async function cargarViajesPasajero(pasajeroId: string): Promise<ViajePasajero[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("reservas")
    .select(
      "id, estado, creado_en, viaje:viajes!inner(id, sentido, estado, salida_en, chofer_id, chofer:perfiles!viajes_chofer_id_fkey(nombre, vehiculo:vehiculos(unidad, placa)))"
    )
    .eq("pasajero_id", pasajeroId)
    .in("estado", ["subio", "bajo"])
    .order("creado_en", { ascending: false })
    .limit(40)
  // "subió" cuenta cuando el viaje ya terminó (si va en ruta, está en Mi viaje)
  const filas = (data ?? []).filter((r) => r.estado === "bajo" || r.viaje.estado === "finalizado").slice(0, 30)

  const ids = filas.map((r) => r.viaje.id)
  const { data: califs } = ids.length
    ? await supabase.from("calificaciones").select("viaje_id, estrellas").eq("pasajero_id", pasajeroId).in("viaje_id", ids)
    : { data: [] }
  const estrellasDe = new Map((califs ?? []).map((c) => [c.viaje_id, c.estrellas]))

  return filas.map((r) => {
    const vehiculo = unoSolo(r.viaje.chofer?.vehiculo)
    return {
      reservaId: r.id,
      viajeId: r.viaje.id,
      choferId: r.viaje.chofer_id,
      chofer: r.viaje.chofer?.nombre ?? "Chofer",
      sentido: r.viaje.sentido,
      cuando: r.viaje.salida_en ?? r.creado_en,
      seBajoAntes: r.estado === "bajo",
      unidad: vehiculo?.unidad ?? null,
      placa: vehiculo?.placa ?? null,
      estrellas: estrellasDe.get(r.viaje.id) ?? null,
    }
  })
}

// ---------------------------------------------------------------------------------------------
// Chofer: Mis viajes (R50)
// ---------------------------------------------------------------------------------------------

export type PersonaDelViaje = {
  nombre: string
  personas: number // con acompañantes (R57)
  // Cómo entró al carro (R50)
  entrada: "app" | "a_mano" | "en_el_camino"
  seBajoAntes: boolean
}

export type ViajeTerminado = {
  id: string
  estado: "finalizado" | "cancelado"
  cerrado: string // cuándo terminó o se canceló
  sentido: Sentido
  salida: string | null
  llegada: string | null
  minutos: number | null
  puestos: number
  llevo: PersonaDelViaje[]
  noVinieron: string[]
  perdieron: string[] // cancelado: quiénes tenían puesto y lo perdieron (solo en el panel del admin)
  calificaciones: { estrellas: number; comentario: string | null; autor?: string }[]
  chofer?: { nombre: string; placa: string | null } // solo en el panel del admin
  eventos?: EventoViaje[] // cronómetro (R56), solo en el panel del admin
}

/** Los últimos 20 viajes terminados del chofer, con quién llevó y cómo le fue */
export async function cargarViajesChofer(choferId: string): Promise<ViajeTerminado[]> {
  return cargarTerminados({ choferId, limite: 20, admin: false })
}

export type FiltroCerrados = "terminados" | "cancelados" | "todos"
export const POR_PAGINA = 50

const ESTADOS_DE: Record<FiltroCerrados, ("finalizado" | "cancelado")[]> = {
  terminados: ["finalizado"],
  cancelados: ["cancelado"],
  todos: ["finalizado", "cancelado"],
}

export type TotalesCerrados = { terminados: number; cancelados: number; pasajeros: number; promedio: number | null; calificaciones: number }

/**
 * Viajes cerrados de toda la línea para el panel (§8): terminados, cancelados o todos, desde una fecha (o todos), de
 * 50 en 50 (`pagina` desde 1). Nombres completos y quién calificó. Los totales son del período entero.
 */
export async function cargarViajesCerradosAdmin({
  desde,
  filtro,
  pagina,
}: {
  desde: Date | null
  filtro: FiltroCerrados
  pagina: number
}): Promise<{ viajes: ViajeTerminado[]; hayMas: boolean; totales: TotalesCerrados }> {
  const [viajes, totales] = await Promise.all([
    cargarTerminados({ desde: desde ?? undefined, estados: ESTADOS_DE[filtro], desdeFila: (pagina - 1) * POR_PAGINA, limite: POR_PAGINA + 1, admin: true }),
    cargarTotalesCerrados(desde),
  ])
  return { viajes: viajes.slice(0, POR_PAGINA), hayMas: viajes.length > POR_PAGINA, totales }
}

async function cargarTotalesCerrados(desde: Date | null): Promise<TotalesCerrados> {
  const supabase = await crearClienteServidor()
  const contar = (estado: "finalizado" | "cancelado") => {
    let q = supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", estado)
    if (desde) q = q.gte("estado_en", desde.toISOString())
    return q
  }
  let llevados = supabase
    .from("reservas")
    .select("personas, viaje:viajes!inner(estado, estado_en)")
    .in("estado", ["subio", "bajo"])
    .eq("viaje.estado", "finalizado")
  let califs = supabase.from("calificaciones").select("estrellas, viaje:viajes!inner(estado_en)")
  if (desde) {
    llevados = llevados.gte("viaje.estado_en", desde.toISOString())
    califs = califs.gte("viaje.estado_en", desde.toISOString())
  }
  const [terminados, cancelados, personas, estrellas] = await Promise.all([contar("finalizado"), contar("cancelado"), llevados, califs])
  const notas = (estrellas.data ?? []).map((c) => c.estrellas)
  return {
    terminados: terminados.count ?? 0,
    cancelados: cancelados.count ?? 0,
    pasajeros: (personas.data ?? []).reduce((n, r) => n + r.personas, 0),
    promedio: notas.length ? notas.reduce((n, e) => n + e, 0) / notas.length : null,
    calificaciones: notas.length,
  }
}

async function cargarTerminados({
  choferId,
  desde,
  estados = ["finalizado"],
  desdeFila = 0,
  limite,
  admin,
}: {
  choferId?: string
  desde?: Date
  estados?: ("finalizado" | "cancelado")[]
  desdeFila?: number
  limite: number
  admin: boolean
}): Promise<ViajeTerminado[]> {
  const supabase = await crearClienteServidor()
  let consulta = supabase
    .from("viajes")
    .select("id, estado, estado_en, sentido, puestos, salida_en, llegada_en, chofer:perfiles(nombre, vehiculo:vehiculos(placa))")
    .in("estado", estados)
  if (choferId) consulta = consulta.eq("chofer_id", choferId)
  // estado_en: la hora en que se cerró (al terminar es la llegada)
  if (desde) consulta = consulta.gte("estado_en", desde.toISOString())
  const { data: viajes } = await consulta
    .order("estado_en", { ascending: false })
    .range(desdeFila, desdeFila + limite - 1)
  const ids = (viajes ?? []).map((v) => v.id)
  if (ids.length === 0) return []

  const [reservasRes, califsRes, eventos] = await Promise.all([
    // El chofer lee las reservas de sus viajes; el admin, todas (RLS)
    supabase
      .from("reservas")
      .select("viaje_id, estado, nombre, en_camino, personas, pasajero:perfiles!reservas_pasajero_id_fkey(nombre)")
      .in("viaje_id", ids)
      // sin_puesto: en un viaje cancelado, quien perdió su puesto (R24)
      .in("estado", ["subio", "bajo", "no_llego", "sin_puesto"])
      .order("creado_en"),
    supabase
      .from("calificaciones")
      .select("viaje_id, estrellas, comentario, pasajero:perfiles!calificaciones_pasajero_id_fkey(nombre)")
      .in("viaje_id", ids),
    admin ? cargarEventos(ids) : Promise.resolve(new Map<string, EventoViaje[]>()),
  ])

  return (viajes ?? []).map((v) => {
    const deEste = (reservasRes.data ?? []).filter((r) => r.viaje_id === v.id)
    // El chofer ve el nombre corto; el admin, el completo
    const nombre = (r: (typeof deEste)[number]) =>
      r.pasajero ? (admin ? r.pasajero.nombre : nombreCorto(r.pasajero.nombre)) : (r.nombre ?? "Pasajero sin app")
    const cancelado = v.estado === "cancelado"
    return {
      id: v.id,
      estado: cancelado ? "cancelado" : "finalizado",
      cerrado: v.estado_en,
      sentido: v.sentido,
      salida: v.salida_en,
      llegada: v.llegada_en,
      minutos: v.salida_en && v.llegada_en ? Math.round((new Date(v.llegada_en).getTime() - new Date(v.salida_en).getTime()) / 60_000) : null,
      puestos: v.puestos,
      // Un viaje cancelado no llevó a nadie (quien subió en Gina vuelve a la lista, R69)
      llevo: (cancelado ? [] : deEste.filter((r) => r.estado === "subio" || r.estado === "bajo"))
        .map((r) => ({
          nombre: nombre(r),
          personas: r.personas,
          entrada: !r.pasajero ? "a_mano" : r.en_camino ? "en_el_camino" : "app",
          seBajoAntes: r.estado === "bajo",
        })),
      noVinieron: deEste.filter((r) => r.estado === "no_llego").map(nombre),
      perdieron: admin && cancelado ? deEste.filter((r) => r.estado === "sin_puesto").map(nombre) : [],
      // El chofer no sabe quién lo calificó (R52); el admin sí
      calificaciones: (califsRes.data ?? [])
        .filter((c) => c.viaje_id === v.id)
        .map((c) => ({ estrellas: c.estrellas, comentario: c.comentario, ...(admin && c.pasajero ? { autor: c.pasajero.nombre } : {}) })),
      ...(admin ? { eventos: eventos.get(v.id) ?? [] } : {}),
      ...(admin && v.chofer ? { chofer: { nombre: v.chofer.nombre, placa: unoSolo(v.chofer.vehiculo)?.placa ?? null } } : {}),
    }
  })
}

// ---------------------------------------------------------------------------------------------
// Chofer: Mis calificaciones (R52)
// ---------------------------------------------------------------------------------------------

export type ResumenCalificaciones = {
  promedio: number | null
  cantidad: number
  porEstrellas: Record<1 | 2 | 3 | 4 | 5, number>
  etiquetas: { etiqueta: string; veces: number }[]
  recientes: { estrellas: number; etiquetas: string[]; comentario: string | null; creadoEn: string; sentido: Sentido | null }[]
}

/** Todas sus calificaciones, sin el nombre de quien calificó (R52) */
export async function cargarCalificacionesChofer(choferId: string): Promise<ResumenCalificaciones> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("calificaciones")
    .select("estrellas, etiquetas, comentario, creado_en, viaje:viajes(sentido)")
    .eq("chofer_id", choferId)
    .order("creado_en", { ascending: false })
  const filas = data ?? []

  const porEstrellas = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const veces = new Map<string, number>()
  for (const c of filas) {
    porEstrellas[c.estrellas as 1 | 2 | 3 | 4 | 5] += 1
    for (const e of c.etiquetas) veces.set(e, (veces.get(e) ?? 0) + 1)
  }
  return {
    promedio: filas.length ? filas.reduce((s, c) => s + c.estrellas, 0) / filas.length : null,
    cantidad: filas.length,
    porEstrellas,
    etiquetas: [...veces].map(([etiqueta, n]) => ({ etiqueta, veces: n })).sort((a, b) => b.veces - a.veces),
    recientes: filas.slice(0, 30).map((c) => ({
      estrellas: c.estrellas,
      etiquetas: c.etiquetas,
      comentario: c.comentario,
      creadoEn: c.creado_en,
      sentido: unoSolo(c.viaje)?.sentido ?? null,
    })),
  }
}

// ---------------------------------------------------------------------------------------------
// Mi carnet (R53)
// ---------------------------------------------------------------------------------------------

export type Carnet = {
  perfil: Perfil
  telefono: string | null
  cedula: string | null
  vehiculo: Vehiculo | null
  estrellas: { promedio: number; cantidad: number } | null
  fotoUrl: string | null // R54
  fotoCarroUrl: string | null
}

export async function cargarCarnet(perfil: Perfil): Promise<Carnet> {
  const supabase = await crearClienteServidor()
  const esChofer = perfil.rol === "chofer"
  const [privados, vehiculo, califs] = await Promise.all([
    supabase.rpc("mis_datos_privados").maybeSingle(),
    esChofer ? supabase.from("vehiculos").select("unidad, placa, modelo, color, foto_path, aire_acondicionado").eq("chofer_id", perfil.id).maybeSingle() : null,
    esChofer ? supabase.from("calificaciones").select("estrellas").eq("chofer_id", perfil.id) : null,
  ])
  const lista = califs?.data ?? []
  const fotos = await firmarFotos([perfil.foto_path, vehiculo?.data?.foto_path])
  return {
    perfil,
    telefono: privados.data?.telefono ?? null,
    cedula: privados.data?.cedula ?? null,
    vehiculo: vehiculo?.data ?? null,
    estrellas: lista.length ? { promedio: lista.reduce((s, c) => s + c.estrellas, 0) / lista.length, cantidad: lista.length } : null,
    fotoUrl: perfil.foto_path ? (fotos.get(perfil.foto_path) ?? null) : null,
    fotoCarroUrl: vehiculo?.data?.foto_path ? (fotos.get(vehiculo.data.foto_path) ?? null) : null,
  }
}

// ---------------------------------------------------------------------------------------------
// Pasajero: Choferes (R46)
// ---------------------------------------------------------------------------------------------

export type ChoferDeLaLinea = {
  id: string
  nombre: string
  fotoUrl: string | null
  trabajando: boolean
  vehiculo: (Vehiculo & { fotoUrl: string | null }) | null
  promedio: number | null
  cantidad: number
  comentarios: { estrellas: number; comentario: string; creadoEn: string }[] // los dos más recientes, sin autor
  porCalificar: ViajePasajero | null // su viaje más reciente con este chofer sin calificar (R45)
}

/** Choferes verificados: primero los que trabajan ahora, después por ★ (R46) */
export async function cargarChoferes(pasajeroId: string): Promise<ChoferDeLaLinea[]> {
  const supabase = await crearClienteServidor()
  const [choferesRes, califsRes, misViajes] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre, foto_path, conectado_en, vehiculo:vehiculos(unidad, placa, modelo, color, foto_path, aire_acondicionado)")
      .eq("rol", "chofer")
      .eq("estado", "aprobado"),
    supabase.from("calificaciones").select("chofer_id, estrellas, comentario, creado_en").order("creado_en", { ascending: false }),
    cargarViajesPasajero(pasajeroId),
  ])
  const choferes = choferesRes.data ?? []
  const fotos = await firmarFotos(choferes.flatMap((c) => [c.foto_path, unoSolo(c.vehiculo)?.foto_path]))

  const lista = choferes.map((c) => {
    const suyas = (califsRes.data ?? []).filter((k) => k.chofer_id === c.id)
    const vehiculo = unoSolo(c.vehiculo)
    return {
      id: c.id,
      nombre: c.nombre,
      fotoUrl: c.foto_path ? (fotos.get(c.foto_path) ?? null) : null,
      trabajando: c.conectado_en !== null,
      vehiculo: vehiculo ? { ...vehiculo, fotoUrl: vehiculo.foto_path ? (fotos.get(vehiculo.foto_path) ?? null) : null } : null,
      promedio: suyas.length ? suyas.reduce((s, k) => s + k.estrellas, 0) / suyas.length : null,
      cantidad: suyas.length,
      comentarios: suyas
        .filter((k) => k.comentario)
        .slice(0, 2)
        .map((k) => ({ estrellas: k.estrellas, comentario: k.comentario as string, creadoEn: k.creado_en })),
      // misViajes viene del más reciente al más viejo
      porCalificar: misViajes.find((v) => v.choferId === c.id && v.estrellas === null) ?? null,
    }
  })
  return lista.sort(
    (a, b) => Number(b.trabajando) - Number(a.trabajando) || (b.promedio ?? 0) - (a.promedio ?? 0) || a.nombre.localeCompare(b.nombre, "es")
  )
}
