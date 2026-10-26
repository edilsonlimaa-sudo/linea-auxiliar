import "server-only"

import type { DatosPagoMovil } from "@/lib/bancos"
import type { Database } from "@/lib/database.types"
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { ACTIVOS, actividadDeChofer, type Viaje } from "@/lib/viajes"

type Tablas = Database["public"]["Tables"]
export type Reserva = Tablas["reservas"]["Row"]
export type Espera = Tablas["esperas"]["Row"]
export type Vehiculo = Pick<Tablas["vehiculos"]["Row"], "unidad" | "placa" | "modelo" | "color" | "foto_path" | "aire_acondicionado"> & {
  fotoUrl: string | null // enlace firmado de la foto del carro (R54)
}
export type FilaLista = Database["public"]["Functions"]["lista_viaje"]["Returns"][number]

export type Chofer = {
  id: string
  nombre: string
  foto_path: string | null
  fotoUrl: string | null // enlace firmado de la foto de perfil (R54)
  vehiculo: Vehiculo | null
  estrellas: number | null // promedio
  calificaciones: number
}

export type ViajeConChofer = Viaje & { chofer: Chofer }

export type MiReserva = {
  reserva: Reserva
  viaje: ViajeConChofer
  posicion: number // orden en la lista (1 = primera reserva)
  desde: number // primer puesto que ocupa (R57: un grupo ocupa puestos seguidos)
  hasta: number // último puesto; con puesto si hasta ≤ puestos del carro
  turno: number // en lista de espera: 1 = el próximo
  lista: FilaLista[]
  telefonoChofer: string | null
}

export type ChoferEnServicio = {
  id: string
  nombre: string
  fotoUrl: string | null
  unidad: string | null
  placa: string | null
  aire: boolean
  estrellas: number | null
  actividad: string // "Recogiendo en Valle Grande", "En ruta hacia el Centro", "Disponible"
}

/** Chofer desconectado que dijo si vuelve hoy (R60). vuelveEn null = terminó por hoy */
export type ChoferEnPausa = { id: string; nombre: string; fotoUrl: string | null; vuelveEn: string | null; sinHora: boolean }

export type DatosInicioPasajero = {
  viajes: ViajeConChofer[]
  porId: Map<string, Viaje>
  miReserva: MiReserva | null
  miEspera: Espera | null
  // "Lo de siempre" (§8): su último pedido, para repetirlo de un toque. conGps: lo pidió con GPS (se vuelve a leer)
  ultimoPedido: { sentido: Viaje["sentido"]; lugar: string | null; conGps: boolean } | null
  aviso: { texto: string; creado_en: string } | null
  unidadesEnServicio: number
  enServicio: ChoferEnServicio[] // quién trabaja ahora y qué hace (R7)
  enPausa: ChoferEnPausa[] // quién vuelve y a qué hora, quién terminó por hoy (R60)
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

export type CalificacionPendiente = {
  reservaId: string
  viajeId: string
  choferId: string
  chofer: string
  sentido: Viaje["sentido"]
  salidaEn?: string | null // para la tarifa del pasaje (R79)
}

/**
 * Viaje por calificar (R45): terminado hace menos de 12 h, sin calificar ni "Ahora no". Para el pasajero, su
 * viaje termina cuando el chofer termina el viaje **o** cuando marca que se bajó (R38), aunque el carro siga.
 */
export async function cargarCalificacionPendiente(pasajeroId: string): Promise<CalificacionPendiente | null> {
  const supabase = await crearClienteServidor()
  const hace12h = new Date(Date.now() - 12 * 3_600_000).toISOString()
  const campos = "id, viaje_id, cerrada_en, viaje:viajes!inner(estado, llegada_en, salida_en, sentido, chofer_id, chofer:perfiles!viajes_chofer_id_fkey(nombre))"
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
    salidaEn: data.viaje.salida_en,
  }
}

/** ¿Tiene un viaje en curso o por calificar? Decide si el menú muestra "Mi viaje" e Inicio lo lleva allá. */
export async function tieneViajeEnCurso(pasajeroId: string): Promise<boolean> {
  const supabase = await crearClienteServidor()
  const [{ data }, { count }] = await Promise.all([
    consultarReservaEnCurso(supabase, pasajeroId),
    // Anotado en la lista hacia Valle Grande (§5.17)
    supabase
      .from("lista_gina")
      .select("id", { count: "exact", head: true })
      .eq("pasajero_id", pasajeroId)
      .eq("estado", "esperando")
      .gt("vence_en", new Date().toISOString()),
  ])
  return data !== null || (count ?? 0) > 0 || (await cargarCalificacionPendiente(pasajeroId)) !== null
}

export type AvisoDeCierre = { reservaId: string; motivo: "salio_lleno" | "cancelo" | "cerrado" | "rechazo" | "no_llego"; chofer: string }

/** Si en los últimos 30 min otro cerró su reserva, se le explica qué pasó (R14, R21, R24, R29) */
export async function cargarAvisoDeCierre(pasajeroId: string): Promise<AvisoDeCierre | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("reservas")
    .select("id, estado, cerrada_en, viaje:viajes!inner(estado, sentido, salida_en, chofer:perfiles!viajes_chofer_id_fkey(nombre))")
    .eq("pasajero_id", pasajeroId)
    .in("estado", ["sin_puesto", "rechazada", "no_llego"])
    .gt("cerrada_en", new Date(Date.now() - 30 * 60_000).toISOString())
    .order("cerrada_en", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  // Hacia Valle Grande, quien queda sin puesto vuelve a la lista en su lugar (R69): no hay nada que explicar
  if (data.estado === "sin_puesto" && data.viaje.sentido === "centro_a_vg") return null
  // Sin puesto después de salir el carro: el viaje se cerró sin pasar por él (R69), no que salió lleno
  const despuesDeSalir =
    data.viaje.salida_en !== null && data.cerrada_en !== null && new Date(data.cerrada_en).getTime() - new Date(data.viaje.salida_en).getTime() > 60_000
  const motivo =
    data.estado === "rechazada"
      ? "rechazo"
      : data.estado === "no_llego"
        ? "no_llego"
        : data.viaje.estado === "cancelado"
          ? "cancelo"
          : despuesDeSalir
            ? "cerrado"
            : "salio_lleno"
  return { reservaId: data.id, motivo, chofer: data.viaje.chofer?.nombre ?? "El chofer" }
}

type Pedido = { lugar: string | null; lat: number | null; creado_en: string }
function ultimoPedido(
  espera: (Pedido & { sentido: Viaje["sentido"] }) | null,
  reserva: (Pedido & { viaje: { sentido: Viaje["sentido"] } }) | null
): DatosInicioPasajero["ultimoPedido"] {
  const candidatos = [
    espera && { sentido: espera.sentido, lugar: espera.lugar, conGps: espera.lat !== null, creado: espera.creado_en },
    reserva && { sentido: reserva.viaje.sentido, lugar: reserva.lugar, conGps: reserva.lat !== null, creado: reserva.creado_en },
  ].filter((c) => c !== null && (c.lugar !== null || c.conGps))
  const ultimo = candidatos.sort((a, b) => (b?.creado ?? "").localeCompare(a?.creado ?? ""))[0]
  return ultimo ? { sentido: ultimo.sentido, lugar: ultimo.lugar, conGps: ultimo.conGps } : null
}

export async function cargarInicioPasajero(pasajeroId: string): Promise<DatosInicioPasajero> {
  const supabase = await crearClienteServidor()

  const [viajesRes, reservaRes, esperaRes, avisoRes, enServicioRes, ultEsperaRes, ultReservaRes, pausaRes] = await Promise.all([
    supabase
      .from("viajes")
      .select("*, chofer:perfiles!viajes_chofer_id_fkey(id, nombre, foto_path, vehiculo:vehiculos(unidad, placa, modelo, color, foto_path, aire_acondicionado))")
      .in("estado", ACTIVOS),
    consultarReservaEnCurso(supabase, pasajeroId),
    supabase
      .from("esperas")
      .select("*")
      .eq("pasajero_id", pasajeroId)
      .eq("estado", "esperando")
      .gt("creado_en", new Date(Date.now() - 2 * 3_600_000).toISOString())
      .maybeSingle(),
    supabase
      .from("avisos")
      .select("texto, creado_en")
      .gte("creado_en", inicioDelDiaCaracas())
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Choferes trabajando ahora (R7): quiénes son, no solo cuántos
    supabase
      .from("perfiles")
      .select("id, nombre, foto_path, vehiculo:vehiculos(unidad, placa, aire_acondicionado)")
      .eq("rol", "chofer")
      .eq("estado", "aprobado")
      .not("conectado_en", "is", null),
    // Último pedido: la espera o la reserva más reciente (cualquier estado), para "Lo de siempre"
    supabase.from("esperas").select("sentido, lugar, lat, creado_en").eq("pasajero_id", pasajeroId).order("creado_en", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("reservas")
      .select("lugar, lat, creado_en, viaje:viajes!inner(sentido)")
      .eq("pasajero_id", pasajeroId)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // R60: los que se desconectaron diciendo si vuelven (la base ya filtra lo vencido)
    supabase.rpc("choferes_en_pausa"),
  ])
  const pausas = pausaRes.data ?? []

  // Reputación de los choferes que aparecen (R46)
  const filas = viajesRes.data ?? []
  const conectados = enServicioRes.data ?? []
  const idsChoferes = [...new Set([...filas.map((v) => v.chofer_id), ...conectados.map((c) => c.id)])]
  const { data: califs } = idsChoferes.length
    ? await supabase.from("calificaciones").select("chofer_id, estrellas").in("chofer_id", idsChoferes)
    : { data: [] as { chofer_id: string; estrellas: number }[] }
  const reputacion = new Map<string, { suma: number; n: number }>()
  for (const c of califs ?? []) {
    const r = reputacion.get(c.chofer_id) ?? { suma: 0, n: 0 }
    reputacion.set(c.chofer_id, { suma: r.suma + c.estrellas, n: r.n + 1 })
  }

  // vehiculos tiene chofer_id único: puede venir como objeto o como lista de uno
  const vehiculoDe = (c: (typeof filas)[number]["chofer"]) => (Array.isArray(c?.vehiculo) ? (c.vehiculo[0] ?? null) : (c?.vehiculo ?? null))
  // Fotos del chofer y del carro (R54): enlaces firmados en una sola llamada
  const fotos = await firmarFotos([...filas.flatMap((v) => [v.chofer?.foto_path, vehiculoDe(v.chofer)?.foto_path]), ...conectados.map((c) => c.foto_path), ...pausas.map((p) => p.foto_path)])

  const viajes: ViajeConChofer[] = filas.map(({ chofer, ...v }) => {
    const r = reputacion.get(v.chofer_id)
    const datosCarro = vehiculoDe(chofer)
    const vehiculo = datosCarro ? { ...datosCarro, fotoUrl: datosCarro.foto_path ? (fotos.get(datosCarro.foto_path) ?? null) : null } : null
    return {
      ...v,
      chofer: {
        id: v.chofer_id,
        nombre: chofer?.nombre ?? "Chofer",
        foto_path: chofer?.foto_path ?? null,
        fotoUrl: chofer?.foto_path ? (fotos.get(chofer.foto_path) ?? null) : null,
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
    const mia = lista.find((f) => f.es_mio)
    miReserva = {
      reserva,
      viaje: viajeReservado,
      lista,
      posicion: mia?.posicion ?? 0,
      desde: mia?.desde ?? 0,
      hasta: mia?.hasta ?? 0,
      // Cuántos sin puesto van antes, contándola (la lista de espera es de a uno, R57)
      turno: mia ? lista.filter((f) => !f.confirmado && f.posicion <= mia.posicion).length : 0,
      telefonoChofer: telRes.data?.telefono ?? null,
    }
  }

  return {
    viajes,
    porId,
    miReserva,
    miEspera: esperaRes.data ?? null,
    aviso: avisoRes.data ?? null,
    unidadesEnServicio: conectados.length,
    enServicio: conectados
      .map((c) => {
        const carro = Array.isArray(c.vehiculo) ? (c.vehiculo[0] ?? null) : c.vehiculo
        const r = reputacion.get(c.id)
        return {
          id: c.id,
          nombre: c.nombre,
          fotoUrl: c.foto_path ? (fotos.get(c.foto_path) ?? null) : null,
          unidad: carro?.unidad ?? null,
          placa: carro?.placa ?? null,
          aire: carro?.aire_acondicionado ?? false,
          estrellas: r ? r.suma / r.n : null,
          actividad: actividadDeChofer(viajes.filter((v) => v.chofer_id === c.id)),
        }
      })
      // Los que tienen algo en marcha primero; los disponibles al final
      .sort((a, b) => Number(a.actividad === "Disponible") - Number(b.actividad === "Disponible") || a.nombre.localeCompare(b.nombre, "es")),
    ultimoPedido: ultimoPedido(ultEsperaRes.data, ultReservaRes.data),
    enPausa: pausas.map((p) => ({
      id: p.chofer_id,
      nombre: p.nombre,
      fotoUrl: p.foto_path ? (fotos.get(p.foto_path) ?? null) : null,
      vuelveEn: p.vuelve_en,
      sinHora: p.sin_hora,
    })),
  }
}

/**
 * El Pago Móvil del chofer (R74), si este pasajero puede verlo: con reserva o a bordo en un viaje suyo, o hasta 3 h
 * después de bajarse o de terminar el viaje (lo decide la base). Si no lo registró, null.
 */
export async function cargarPagoMovilDe(choferId: string): Promise<DatosPagoMovil | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc("pago_movil_de", { p_chofer: choferId })
  return data?.[0] ?? null
}
