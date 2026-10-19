import "server-only"

import type { Database } from "@/lib/database.types"
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { nombreCorto, type Sentido } from "@/lib/viajes"

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
  // Cómo entró al carro (R50)
  entrada: "app" | "a_mano" | "en_el_camino"
  seBajoAntes: boolean
}

export type ViajeTerminado = {
  id: string
  sentido: Sentido
  salida: string | null
  llegada: string | null
  minutos: number | null
  puestos: number
  llevo: PersonaDelViaje[]
  noVinieron: string[]
  calificaciones: { estrellas: number; comentario: string | null }[]
}

/** Los últimos 20 viajes terminados del chofer, con quién llevó y cómo le fue */
export async function cargarViajesChofer(choferId: string): Promise<ViajeTerminado[]> {
  const supabase = await crearClienteServidor()
  const { data: viajes } = await supabase
    .from("viajes")
    .select("id, sentido, puestos, salida_en, llegada_en")
    .eq("chofer_id", choferId)
    .eq("estado", "finalizado")
    .order("llegada_en", { ascending: false })
    .limit(20)
  const ids = (viajes ?? []).map((v) => v.id)
  if (ids.length === 0) return []

  const [reservasRes, califsRes] = await Promise.all([
    // El chofer lee las reservas de sus viajes (RLS)
    supabase
      .from("reservas")
      .select("viaje_id, estado, nombre, en_camino, pasajero:perfiles!reservas_pasajero_id_fkey(nombre)")
      .in("viaje_id", ids)
      .in("estado", ["subio", "bajo", "no_llego"])
      .order("creado_en"),
    supabase.from("calificaciones").select("viaje_id, estrellas, comentario").in("viaje_id", ids),
  ])

  return (viajes ?? []).map((v) => {
    const deEste = (reservasRes.data ?? []).filter((r) => r.viaje_id === v.id)
    const nombre = (r: (typeof deEste)[number]) => (r.pasajero ? nombreCorto(r.pasajero.nombre) : (r.nombre ?? "Pasajero sin app"))
    return {
      id: v.id,
      sentido: v.sentido,
      salida: v.salida_en,
      llegada: v.llegada_en,
      minutos: v.salida_en && v.llegada_en ? Math.round((new Date(v.llegada_en).getTime() - new Date(v.salida_en).getTime()) / 60_000) : null,
      puestos: v.puestos,
      llevo: deEste
        .filter((r) => r.estado !== "no_llego")
        .map((r) => ({
          nombre: nombre(r),
          entrada: !r.pasajero ? "a_mano" : r.en_camino ? "en_el_camino" : "app",
          seBajoAntes: r.estado === "bajo",
        })),
      noVinieron: deEste.filter((r) => r.estado === "no_llego").map(nombre),
      // Sin quién calificó (R52)
      calificaciones: (califsRes.data ?? []).filter((c) => c.viaje_id === v.id).map((c) => ({ estrellas: c.estrellas, comentario: c.comentario })),
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
