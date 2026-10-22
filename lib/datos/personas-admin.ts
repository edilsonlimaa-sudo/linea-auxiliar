import "server-only"

// Choferes y Pasajeros del panel (docs/especificacion.md §8): lista con búsqueda y el detalle de cada persona.
// El admin lee todo por RLS; las cuentas con teléfono y cédula salen de admin_cuentas (cargarCuentas).
import { cargarCuentas, type CuentaConActividad, type RolCuenta } from "@/lib/datos/admin"
import { cargarHistorialListaAdmin, type SalidaLista } from "@/lib/datos/lista-gina"
import { cargarViajesDeChoferAdmin, type ViajeTerminado } from "@/lib/datos/historial"
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import type { Sentido } from "@/lib/viajes"

// "José Ramírez" / "jose ramirez" / "JOSÉ": se busca sin tildes ni mayúsculas
const normal = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

export type FilaPersona = CuentaConActividad & { fotoUrl: string | null }

/** Los aprobados de un rol, filtrados por la búsqueda: conectados primero, después quien viajó más reciente */
export async function cargarPersonas(rol: RolCuenta, busqueda: string): Promise<{ personas: FilaPersona[]; total: number; error: string | null }> {
  const { cuentas, error } = await cargarCuentas()
  const aprobados = cuentas.filter((c) => c.rol === rol && c.estado === "aprobado")
  const q = normal(busqueda.trim())
  const digitos = busqueda.replace(/\D/g, "")
  const coinciden = q
    ? aprobados.filter((c) => {
        const textos = [c.nombre, c.cedula, rol === "chofer" ? c.placa : c.urbanismo, rol === "chofer" ? c.unidad : null]
        // El teléfono, por sus dígitos (sin el 58 ni el 0 del principio importa: basta con que contenga lo escrito)
        return textos.some((t) => normal(t).includes(q)) || (digitos.length >= 3 && (c.telefono ?? "").replace(/\D/g, "").includes(digitos.replace(/^0/, "")))
      })
    : aprobados
  const orden = [...coinciden].sort(
    (a, b) =>
      Number(Boolean(b.actividad?.conectado)) - Number(Boolean(a.actividad?.conectado)) ||
      (b.actividad?.ultimo_viaje ?? "").localeCompare(a.actividad?.ultimo_viaje ?? "") ||
      a.nombre.localeCompare(b.nombre)
  )
  const fotos = await firmarFotos(orden.map((c) => c.foto_path))
  return {
    personas: orden.map((c) => ({ ...c, fotoUrl: c.foto_path ? (fotos.get(c.foto_path) ?? null) : null })),
    total: aprobados.length,
    error,
  }
}

async function cargarCuenta(id: string, rol: RolCuenta) {
  const { cuentas } = await cargarCuentas()
  const cuenta = cuentas.find((c) => c.id === id && c.rol === rol)
  if (!cuenta) return null
  const fotos = await firmarFotos([cuenta.foto_path, cuenta.foto_carro_path])
  return {
    ...cuenta,
    fotoUrl: cuenta.foto_path ? (fotos.get(cuenta.foto_path) ?? null) : null,
    fotoCarroUrl: cuenta.foto_carro_path ? (fotos.get(cuenta.foto_carro_path) ?? null) : null,
  }
}

export type CalificacionRecibida = { estrellas: number; comentario: string | null; autor: string; creadoEn: string }

export type DetalleChofer = {
  cuenta: NonNullable<Awaited<ReturnType<typeof cargarCuenta>>>
  terminados: number
  cancelados: number
  llevados: number
  viajes: ViajeTerminado[]
  calificaciones: CalificacionRecibida[]
}

export async function cargarDetalleChofer(id: string): Promise<DetalleChofer | null> {
  const cuenta = await cargarCuenta(id, "chofer")
  if (!cuenta) return null
  const supabase = await crearClienteServidor()
  const contar = (estado: "finalizado" | "cancelado") =>
    supabase.from("viajes").select("id", { count: "exact", head: true }).eq("chofer_id", id).eq("estado", estado)
  const [terminados, cancelados, llevados, viajes, califs] = await Promise.all([
    contar("finalizado"),
    contar("cancelado"),
    supabase
      .from("reservas")
      .select("personas, viaje:viajes!inner(chofer_id, estado)")
      .in("estado", ["subio", "bajo"])
      .eq("viaje.chofer_id", id)
      .eq("viaje.estado", "finalizado"),
    cargarViajesDeChoferAdmin(id),
    supabase
      .from("calificaciones")
      .select("estrellas, comentario, creado_en, pasajero:perfiles!calificaciones_pasajero_id_fkey(nombre)")
      .eq("chofer_id", id)
      .order("creado_en", { ascending: false })
      .limit(10),
  ])
  return {
    cuenta,
    terminados: terminados.count ?? 0,
    cancelados: cancelados.count ?? 0,
    llevados: (llevados.data ?? []).reduce((n, r) => n + r.personas, 0),
    viajes,
    calificaciones: (califs.data ?? []).map((c) => ({
      estrellas: c.estrellas,
      comentario: c.comentario,
      autor: c.pasajero?.nombre ?? "Pasajero",
      creadoEn: c.creado_en,
    })),
  }
}

export type EstadoReserva = "activa" | "subio" | "bajo" | "no_llego" | "cancelada" | "sin_puesto" | "rechazada"

export type ReservaDelPasajero = {
  id: string
  estado: EstadoReserva
  personas: number
  lugar: string | null
  creadoEn: string
  sentido: Sentido
  viajeEstado: string
  salida: string | null
  chofer: string
  calificacion: number | null // la que le dio a ese viaje
}

export type DetallePasajero = {
  cuenta: NonNullable<Awaited<ReturnType<typeof cargarCuenta>>>
  viajo: number // subió o se bajó antes, en viajes terminados
  cancelo: number
  noLlego: number
  calificaciones: number
  reservas: ReservaDelPasajero[]
  lista: SalidaLista[] // sus veces en la Lista hacia Valle Grande
}

export async function cargarDetallePasajero(id: string): Promise<DetallePasajero | null> {
  const cuenta = await cargarCuenta(id, "pasajero")
  if (!cuenta) return null
  const supabase = await crearClienteServidor()
  const contar = (estados: EstadoReserva[]) =>
    supabase.from("reservas").select("id", { count: "exact", head: true }).eq("pasajero_id", id).in("estado", estados)
  const [viajo, cancelo, noLlego, califs, reservas, lista] = await Promise.all([
    supabase
      .from("reservas")
      .select("id, viaje:viajes!inner(estado)", { count: "exact", head: true })
      .eq("pasajero_id", id)
      .in("estado", ["subio", "bajo"])
      .eq("viaje.estado", "finalizado"),
    contar(["cancelada"]),
    contar(["no_llego"]),
    supabase.from("calificaciones").select("viaje_id, estrellas").eq("pasajero_id", id),
    supabase
      .from("reservas")
      .select("id, viaje_id, estado, personas, lugar, creado_en, viaje:viajes!inner(sentido, estado, salida_en, chofer:perfiles!viajes_chofer_id_fkey(nombre))")
      .eq("pasajero_id", id)
      .order("creado_en", { ascending: false })
      .limit(30),
    cargarHistorialListaAdmin(new Date(0), undefined, id),
  ])
  const notaDe = new Map((califs.data ?? []).map((c) => [c.viaje_id, c.estrellas]))
  return {
    cuenta,
    viajo: viajo.count ?? 0,
    cancelo: cancelo.count ?? 0,
    noLlego: noLlego.count ?? 0,
    calificaciones: califs.data?.length ?? 0,
    reservas: (reservas.data ?? []).map((r) => ({
      id: r.id,
      estado: r.estado,
      personas: r.personas,
      lugar: r.lugar,
      creadoEn: r.creado_en,
      sentido: r.viaje.sentido,
      viajeEstado: r.viaje.estado,
      salida: r.viaje.salida_en,
      chofer: r.viaje.chofer?.nombre ?? "Chofer",
      calificacion: notaDe.get(r.viaje_id) ?? null,
    })),
    lista,
  }
}
