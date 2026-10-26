// Cargas que solo usa la interfaz nueva del pasajero (§5.21): el perfil de un chofer con sus opiniones y el detalle de
// un viaje hecho. El resto (Inicio, choferes, Mis viajes, carnet) usa las de siempre de lib/datos
import "server-only"

import type { DatosPagoMovil } from "@/lib/bancos"
import { cargarPagoMovilDe } from "@/lib/datos/inicio-pasajero"
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { iniciales, type Sentido } from "@/lib/viajes"

const unoSolo = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null))

export type Opinion = { estrellas: number; etiquetas: string[]; comentario: string | null; creadaEn: string }

export type PerfilChofer = {
  id: string
  nombre: string
  iniciales: string
  fotoUrl: string | null
  trabajando: boolean
  carro: { modelo: string | null; color: string | null; placa: string; unidad: string | null; aire: boolean; fotoUrl: string | null } | null
  promedio: number | null
  opiniones: Opinion[] // sin autor (R52), la más nueva primero
}

/** El perfil de un chofer aprobado (R46): carro, si trabaja y lo que dicen los pasajeros, sin nombres */
export async function cargarPerfilChofer(id: string): Promise<PerfilChofer | null> {
  const supabase = await crearClienteServidor()
  const [perfilRes, califsRes] = await Promise.all([
    supabase
      .from("perfiles")
      .select("id, nombre, foto_path, conectado_en, vehiculo:vehiculos(unidad, placa, modelo, color, foto_path, aire_acondicionado)")
      .eq("id", id)
      .eq("rol", "chofer")
      .eq("estado", "aprobado")
      .maybeSingle(),
    supabase.from("calificaciones").select("estrellas, etiquetas, comentario, creado_en").eq("chofer_id", id).order("creado_en", { ascending: false }).limit(50),
  ])
  const c = perfilRes.data
  if (!c) return null
  const v = unoSolo(c.vehiculo)
  const fotos = await firmarFotos([c.foto_path, v?.foto_path])
  const califs = califsRes.data ?? []
  return {
    id: c.id,
    nombre: c.nombre,
    iniciales: iniciales(c.nombre),
    fotoUrl: c.foto_path ? (fotos.get(c.foto_path) ?? null) : null,
    trabajando: c.conectado_en !== null,
    carro: v
      ? { modelo: v.modelo, color: v.color, placa: v.placa, unidad: v.unidad, aire: v.aire_acondicionado, fotoUrl: v.foto_path ? (fotos.get(v.foto_path) ?? null) : null }
      : null,
    promedio: califs.length ? califs.reduce((s, k) => s + k.estrellas, 0) / califs.length : null,
    opiniones: califs.map((k) => ({ estrellas: k.estrellas, etiquetas: k.etiquetas ?? [], comentario: k.comentario, creadaEn: k.creado_en })),
  }
}

export type DetalleViaje = {
  reservaId: string
  viajeId: string
  sentido: Sentido
  cuando: string
  personas: number
  lugar: string | null
  chofer: { id: string; nombre: string; iniciales: string; fotoUrl: string | null; placa: string | null; modelo: string | null; color: string | null }
  calificacion: Opinion | null
  pago: DatosPagoMovil | null // solo hasta 3 h después (lo decide la base, R74)
}

/** Un viaje que hizo (subió o se bajó), con su calificación y, si todavía corresponde, el Pago Móvil */
export async function cargarDetalleViaje(pasajeroId: string, reservaId: string): Promise<DetalleViaje | null> {
  const supabase = await crearClienteServidor()
  const { data: r } = await supabase
    .from("reservas")
    .select(
      "id, personas, lugar, creado_en, viaje:viajes!inner(id, sentido, salida_en, chofer_id, chofer:perfiles!viajes_chofer_id_fkey(nombre, foto_path, vehiculo:vehiculos(placa, modelo, color)))"
    )
    .eq("id", reservaId)
    .eq("pasajero_id", pasajeroId)
    .in("estado", ["subio", "bajo"])
    .maybeSingle()
  if (!r) return null
  const [califRes, pago, fotos] = await Promise.all([
    supabase.from("calificaciones").select("estrellas, etiquetas, comentario, creado_en").eq("viaje_id", r.viaje.id).eq("pasajero_id", pasajeroId).maybeSingle(),
    cargarPagoMovilDe(r.viaje.chofer_id),
    firmarFotos([r.viaje.chofer?.foto_path]),
  ])
  const chofer = r.viaje.chofer
  const v = unoSolo(chofer?.vehiculo)
  const k = califRes.data
  return {
    reservaId: r.id,
    viajeId: r.viaje.id,
    sentido: r.viaje.sentido,
    cuando: r.viaje.salida_en ?? r.creado_en,
    personas: r.personas,
    lugar: r.lugar,
    chofer: {
      id: r.viaje.chofer_id,
      nombre: chofer?.nombre ?? "Chofer",
      iniciales: iniciales(chofer?.nombre ?? "C"),
      fotoUrl: chofer?.foto_path ? (fotos.get(chofer.foto_path) ?? null) : null,
      placa: v?.placa ?? null,
      modelo: v?.modelo ?? null,
      color: v?.color ?? null,
    },
    calificacion: k ? { estrellas: k.estrellas, etiquetas: k.etiquetas ?? [], comentario: k.comentario, creadaEn: k.creado_en } : null,
    pago,
  }
}
