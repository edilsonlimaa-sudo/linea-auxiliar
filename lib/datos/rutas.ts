import "server-only"

import { cargarRecorridos, type RecorridosResumen } from "@/lib/datos/demanda"
import { duracion, SENTIDOS, type Sentido } from "@/lib/viajes"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

export const PERIODOS_RUTAS = [
  { id: "hoy", titulo: "Hoy" },
  { id: "7", titulo: "7 días" },
  { id: "todo", titulo: "Todo" },
] as const
export type PeriodoRutas = (typeof PERIODOS_RUTAS)[number]["id"]

/** Un viaje dibujado: el tramo entre la salida y la llegada, con los puntos del recorrido de su chofer (R92) */
export type RutaViaje = {
  id: string
  sentido: Sentido
  chofer: string
  cuando: string // "28/10 5:12 p. m. · 24 min", escrito en el servidor
  puntos: [number, number][]
}

export type DatosRutas = {
  resumen: RecorridosResumen
  viajes: RutaViaje[]
  choferes: { id: string; nombre: string }[] // los que tienen recorridos en el período, para el filtro
}

const DIA = 86_400_000
const fechaHora = (iso: string) =>
  new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(new Date(iso))
const inicioDeHoy = () => {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date())
  return new Date(`${hoy}T00:00:00-04:00`)
}

/**
 * Rutas (R92): los lotes del recorrido se reparten entre los viajes terminados del chofer cruzando la hora (de la
 * salida a la llegada). Lo de antes de salir (ir a recoger) no se dibuja: es la ruta entre las zonas lo que interesa.
 */
export async function cargarRutas(periodo: PeriodoRutas, sentido: Sentido | null, chofer: string | null): Promise<DatosRutas> {
  const supabase = await crearClienteServidor()
  const desde = periodo === "hoy" ? inicioDeHoy() : periodo === "7" ? new Date(Date.now() - 7 * DIA) : new Date(Date.now() - 60 * DIA)

  let lotes = supabase.from("trayectos").select("chofer_id, desde, hasta, puntos").gte("hasta", desde.toISOString()).order("desde")
  if (chofer) lotes = lotes.eq("chofer_id", chofer)
  const [resumen, lotesRes] = await Promise.all([cargarRecorridos(), lotes])
  const filas = lotesRes.data ?? []
  const ids = [...new Set(filas.map((l) => l.chofer_id))]
  if (ids.length === 0) return { resumen, viajes: [], choferes: [] }

  let viajesQ = supabase
    .from("viajes")
    .select("id, chofer_id, sentido, salida_en, llegada_en, chofer:perfiles!viajes_chofer_id_fkey(nombre)")
    .in("chofer_id", ids)
    .eq("estado", "finalizado")
    .not("salida_en", "is", null)
    .not("llegada_en", "is", null)
    .gte("llegada_en", desde.toISOString())
    .order("salida_en")
  if (sentido) viajesQ = viajesQ.eq("sentido", sentido)
  const [{ data: viajes }, { data: nombres }] = await Promise.all([
    viajesQ,
    supabase.from("perfiles").select("id, nombre").in("id", ids),
  ])

  // Los puntos de cada chofer, en orden: [epoch, lat, lng, precisión]
  const puntosDe = new Map<string, number[][]>()
  for (const l of filas) {
    const lista = puntosDe.get(l.chofer_id) ?? []
    lista.push(...(l.puntos as number[][]))
    puntosDe.set(l.chofer_id, lista)
  }
  for (const lista of puntosDe.values()) lista.sort((a, b) => a[0] - b[0])

  const rutas: RutaViaje[] = []
  for (const v of viajes ?? []) {
    const salida = new Date(v.salida_en as string).getTime() / 1000
    const llegada = new Date(v.llegada_en as string).getTime() / 1000
    const puntos = (puntosDe.get(v.chofer_id) ?? []).filter((p) => p[0] >= salida && p[0] <= llegada).map((p) => [p[1], p[2]] as [number, number])
    if (puntos.length < 2) continue
    const nombre = (Array.isArray(v.chofer) ? v.chofer[0]?.nombre : v.chofer?.nombre) ?? "Chofer"
    rutas.push({
      id: v.id,
      sentido: v.sentido,
      chofer: nombre.split(" ")[0],
      cuando: `${fechaHora(v.salida_en as string)} · ${duracion((llegada - salida) / 60)}`,
      puntos,
    })
  }

  return {
    resumen,
    viajes: rutas,
    choferes: (nombres ?? []).map((n) => ({ id: n.id, nombre: n.nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  }
}

export const SENTIDOS_RUTAS = (Object.keys(SENTIDOS) as Sentido[]).map((s) => ({ id: s, titulo: SENTIDOS[s].corto }))
