// Datos del panel del admin (docs/especificacion.md §8, "Panel del admin")
import type { Database } from "@/lib/database.types"
import { firmarFotos } from "@/lib/fotos"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { aceptaReservas, ACTIVOS, type EventoViaje, libres, puestosEnOrden, type Sentido, type Viaje } from "@/lib/viajes"

type Funciones = Database["public"]["Functions"]
export type Cuenta = Funciones["admin_cuentas"]["Returns"][number]
export type Actividad = Omit<Funciones["admin_actividad"]["Returns"][number], "id">
export type CuentaConActividad = Cuenta & { actividad: Actividad | null }
export type Resumen = Funciones["admin_resumen"]["Returns"][number]
export type EstadoCuenta = Database["public"]["Enums"]["estado_cuenta"]
export type RolCuenta = "chofer" | "pasajero"

/** Todas las cuentas (menos admin) con su actividad */
export async function cargarCuentas(): Promise<{ cuentas: CuentaConActividad[]; error: string | null }> {
  const supabase = await crearClienteServidor()
  const [cuentasRes, actividadRes] = await Promise.all([supabase.rpc("admin_cuentas"), supabase.rpc("admin_actividad")])
  const actividad = new Map((actividadRes.data ?? []).map(({ id, ...a }) => [id, a]))
  return {
    cuentas: (cuentasRes.data ?? []).map((c) => ({ ...c, actividad: actividad.get(c.id) ?? null })),
    error: cuentasRes.error?.message ?? null,
  }
}

export async function cargarResumen(): Promise<Resumen | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc("admin_resumen")
  return data?.[0] ?? null
}

/** Pendientes por rol, para las pestañas y "Por revisar" */
export function pendientesPorRol(cuentas: Cuenta[]): Record<RolCuenta, number> {
  const pendientes = cuentas.filter((c) => c.estado === "pendiente")
  return {
    chofer: pendientes.filter((c) => c.rol === "chofer").length,
    pasajero: pendientes.filter((c) => c.rol === "pasajero").length,
  }
}

export type Esperando = Funciones["admin_demanda"]["Returns"][number] & { fotoUrl: string | null; minutos: number }
export type DemandaHoy = Funciones["admin_demanda_hoy"]["Returns"][number]
export type OfertaSentido = { unidades: number; puestosLibres: number }

/** Demanda del panel (§8): quién espera, la oferta por sentido y cómo se atendió hoy */
export async function cargarDemanda(): Promise<{
  esperando: Esperando[]
  oferta: Record<Sentido, OfertaSentido>
  hoy: DemandaHoy | null
  error: string | null
}> {
  const supabase = await crearClienteServidor()
  const [esperandoRes, hoyRes, viajesRes] = await Promise.all([
    supabase.rpc("admin_demanda"),
    supabase.rpc("admin_demanda_hoy"),
    supabase.from("viajes").select("*").in("estado", ACTIVOS),
  ])
  const filas = esperandoRes.data ?? []
  const fotos = await firmarFotos(filas.map((e) => e.foto_path))

  // Unidades que aceptan pasajeros y tienen puesto libre, igual que la oferta que ven los choferes
  const oferta: Record<Sentido, OfertaSentido> = { vg_a_centro: { unidades: 0, puestosLibres: 0 }, centro_a_vg: { unidades: 0, puestosLibres: 0 } }
  for (const v of viajesRes.data ?? []) {
    if (!aceptaReservas(v) || libres(v) === 0) continue
    oferta[v.sentido].unidades += 1
    oferta[v.sentido].puestosLibres += libres(v)
  }

  const ahora = Date.now()
  return {
    esperando: filas.map((e) => ({
      ...e,
      fotoUrl: e.foto_path ? (fotos.get(e.foto_path) ?? null) : null,
      minutos: (ahora - new Date(e.creado_en).getTime()) / 60_000,
    })),
    oferta,
    hoy: hoyRes.data?.[0] ?? null,
    error: esperandoRes.error?.message ?? null,
  }
}

/** Una persona en un viaje en curso, como la ve el admin (nombre completo, dónde y teléfono, §6) */
export type PersonaEnViaje = {
  id: string
  posicion: number // orden en la lista (R17)
  personas: number // con acompañantes (R57)
  desde: number
  hasta: number
  confirmado: boolean // tiene puesto
  nombre: string
  conApp: boolean
  estado: "activa" | "subio" | string
  lugar: string | null
  lat: number | null
  lng: number | null
  listo: boolean
  pendiente: boolean // pedido en el camino sin responder
  telefono: string | null
  fotoUrl: string | null
}
export type ViajeEnCurso = Viaje & { personas: PersonaEnViaje[]; eventos: EventoViaje[] }
export type ChoferEnCurso = {
  id: string
  nombre: string
  fotoUrl: string | null
  telefono: string | null
  conectado: boolean
  placa: string | null
  unidad: string | null
  carro: string | null
  viajes: ViajeEnCurso[] // en ruta, después la recogida, después los próximos
}

// Orden dentro de cada chofer y entre choferes: lo que está pasando primero
const PRIORIDAD: Record<string, number> = { en_ruta: 0, en_parada: 1, llegando: 2, en_camino: 3, programado: 4 }

/** Viajes en curso del panel (§8): por chofer, con la gente de cada viaje */
export async function cargarViajesEnCurso(): Promise<{ choferes: ChoferEnCurso[]; error: string | null }> {
  const supabase = await crearClienteServidor()
  const { data: viajes, error } = await supabase
    .from("viajes")
    .select("*, chofer:perfiles(id, nombre, foto_path, conectado_en, vehiculo:vehiculos(placa, unidad, modelo, color))")
    .in("estado", ACTIVOS)
    .order("creado_en")
  if (error) return { choferes: [], error: error.message }
  const lista = viajes ?? []

  const ids = lista.map((v) => v.id)
  const { data: reservas } = ids.length
    ? await supabase
        .from("reservas")
        .select("*, pasajero:perfiles!reservas_pasajero_id_fkey(nombre, foto_path)")
        .in("viaje_id", ids)
        .in("estado", ["activa", "subio"])
        .order("creado_en")
        .order("id")
    : { data: [] }
  const filas = reservas ?? []
  const eventos = await cargarEventos(ids)

  const idsPersonas = [
    ...new Set([...filas.map((r) => r.pasajero_id), ...lista.map((v) => v.chofer_id)].filter((id): id is string => id !== null)),
  ]
  const [{ data: telefonos }, fotos] = await Promise.all([
    idsPersonas.length ? supabase.from("perfiles_privados").select("id, telefono").in("id", idsPersonas) : Promise.resolve({ data: [] }),
    firmarFotos([...filas.map((r) => r.pasajero?.foto_path), ...lista.map((v) => v.chofer?.foto_path)]),
  ])
  const telefonoDe = new Map((telefonos ?? []).map((t) => [t.id, t.telefono]))
  const foto = (ruta: string | null | undefined) => (ruta ? (fotos.get(ruta) ?? null) : null)

  const porChofer = new Map<string, ChoferEnCurso>()
  for (const { chofer, ...v } of lista) {
    const personas = puestosEnOrden(filas.filter((r) => r.viaje_id === v.id)).map((r, i) => ({
        id: r.id,
        posicion: i + 1,
        personas: r.personas,
        desde: r.desde,
        hasta: r.hasta,
        confirmado: r.hasta <= v.puestos,
        nombre: r.pasajero?.nombre ?? r.nombre ?? "Pasajero sin app",
        conApp: r.pasajero_id !== null,
        estado: r.estado,
        lugar: r.lugar,
        lat: r.lat,
        lng: r.lng,
        listo: r.listo,
        pendiente: r.pendiente,
        telefono: r.pasajero_id ? (telefonoDe.get(r.pasajero_id) ?? null) : null,
        fotoUrl: foto(r.pasajero?.foto_path),
      }))
    const c = porChofer.get(v.chofer_id) ?? {
      id: v.chofer_id,
      nombre: chofer?.nombre ?? "Chofer",
      fotoUrl: foto(chofer?.foto_path),
      telefono: telefonoDe.get(v.chofer_id) ?? null,
      conectado: Boolean(chofer?.conectado_en),
      placa: chofer?.vehiculo?.placa ?? null,
      unidad: chofer?.vehiculo?.unidad ?? null,
      carro: [chofer?.vehiculo?.modelo, chofer?.vehiculo?.color].filter(Boolean).join(" · ") || null,
      viajes: [],
    }
    c.viajes.push({ ...v, personas, eventos: eventos.get(v.id) ?? [] })
    porChofer.set(v.chofer_id, c)
  }

  const choferes = [...porChofer.values()]
  for (const c of choferes) c.viajes.sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado])
  choferes.sort((a, b) => PRIORIDAD[a.viajes[0].estado] - PRIORIDAD[b.viajes[0].estado])
  return { choferes, error: null }
}

export type PausaAbierta = { choferId: string; nombre: string; fotoUrl: string | null; desde: string; vuelveEn: string | null }

/** Choferes en pausa ahora (R60), de hoy: quién dijo que vuelve y a qué hora, y quién terminó por hoy (Viajes en curso) */
export async function cargarPausasAbiertas(desde: Date): Promise<PausaAbierta[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("pausas")
    .select("chofer_id, inicio, vuelve_en, chofer:perfiles!pausas_chofer_id_fkey(nombre, foto_path, conectado_en)")
    .is("cerrada_en", null)
    .gte("inicio", desde.toISOString())
    .order("vuelve_en", { ascending: true, nullsFirst: false })
  const filas = (data ?? []).filter((p) => !p.chofer?.conectado_en)
  const fotos = await firmarFotos(filas.map((p) => p.chofer?.foto_path))
  return filas.map((p) => ({
    choferId: p.chofer_id,
    nombre: p.chofer?.nombre ?? "Chofer",
    fotoUrl: p.chofer?.foto_path ? (fotos.get(p.chofer.foto_path) ?? null) : null,
    desde: p.inicio,
    vuelveEn: p.vuelve_en,
  }))
}

/** Cronómetro de cada viaje (R56): solo el admin puede leerlo */
export async function cargarEventos(ids: string[]): Promise<Map<string, EventoViaje[]>> {
  const porViaje = new Map<string, EventoViaje[]>()
  if (ids.length === 0) return porViaje
  const supabase = await crearClienteServidor()
  const { data } = await supabase.from("viaje_eventos").select("viaje_id, estado, eta_min, en, atraso").in("viaje_id", ids).order("en")
  for (const e of data ?? []) {
    const lista = porViaje.get(e.viaje_id) ?? []
    lista.push({ estado: e.estado, etaMin: e.eta_min, en: e.en, atraso: e.atraso })
    porViaje.set(e.viaje_id, lista)
  }
  return porViaje
}

export type UsoPorChofer = Funciones["admin_uso_por_chofer"]["Returns"][number]
export type PasajeroQueUsa = Omit<Funciones["admin_uso_pasajeros"]["Returns"][number], "foto_path"> & { fotoUrl: string | null; nuevo: boolean }
export type Uso = {
  porChofer: UsoPorChofer[]
  total: { app: number; enCamino: number; aMano: number; llevados: number; porcentajeApp: number | null }
  pasajeros: PasajeroQueUsa[]
  repiten: number // 2 o más viajes en el período
  nuevos: number // su primer viaje fue en el período
}

/** Uso de la app desde una fecha (§8, Resumen punto 5): cómo entraron al carro y quiénes viajan con su cuenta */
export async function cargarUso(desde: Date, { conFotos = false } = {}): Promise<Uso> {
  const supabase = await crearClienteServidor()
  const [choferesRes, pasajerosRes] = await Promise.all([
    supabase.rpc("admin_uso_por_chofer", { p_desde: desde.toISOString() }),
    supabase.rpc("admin_uso_pasajeros", { p_desde: desde.toISOString() }),
  ])
  const porChofer = choferesRes.data ?? []
  const filas = pasajerosRes.data ?? []
  const fotos = conFotos ? await firmarFotos(filas.map((p) => p.foto_path)) : new Map<string, string>()

  const app = porChofer.reduce((n, c) => n + c.app, 0)
  const enCamino = porChofer.reduce((n, c) => n + c.en_camino, 0)
  const aMano = porChofer.reduce((n, c) => n + c.a_mano, 0)
  const llevados = app + enCamino + aMano
  const pasajeros = filas.map(({ foto_path, ...p }) => ({
    ...p,
    fotoUrl: foto_path ? (fotos.get(foto_path) ?? null) : null,
    nuevo: new Date(p.primer_viaje) >= desde,
  }))
  return {
    porChofer,
    total: { app, enCamino, aMano, llevados, porcentajeApp: llevados ? Math.round(((app + enCamino) / llevados) * 100) : null },
    pasajeros,
    repiten: pasajeros.filter((p) => p.viajes >= 2).length,
    nuevos: pasajeros.filter((p) => p.nuevo).length,
  }
}
