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

export const VER_RUTAS = [
  { id: "todo", titulo: "Todo el recorrido" },
  { id: "viajes", titulo: "Solo viajes" },
] as const
export type VerRutas = (typeof VER_RUTAS)[number]["id"]

/**
 * Un tramo dibujado (R92): puntos seguidos de un chofer en el mismo estado. Con sentido, va de la salida a la llegada
 * de un viaje; sin sentido (null), es lo de fuera de un viaje (recoger, ir a la salida, volver vacío).
 */
export type Tramo = {
  viaje: string | null
  sentido: Sentido | null
  chofer: string
  cuando: string // "28/10 5:12 p. m. · 24 min", escrito en el servidor
  puntos: [number, number][]
}

export type DatosRutas = {
  resumen: RecorridosResumen
  tramos: Tramo[]
  choferes: { id: string; nombre: string }[] // los que tienen recorridos en el período, para el filtro
}

const DIA = 86_400_000
const HUECO_S = 120 // más que esto sin puntos corta la línea: no se inventa el tramo
const PRECISION_MAX = 50 // metros
const VELOCIDAD_MAX = 150 / 3.6 // m/s; más que esto es un salto del GPS

const fechaHora = (s: number) =>
  new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(
    new Date(s * 1000)
  )
const inicioDeHoy = () => {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date())
  return new Date(`${hoy}T00:00:00-04:00`)
}
const metros = (a: number[], b: number[]) =>
  111_320 * Math.hypot(b[1] - a[1], (b[2] - a[2]) * Math.cos((a[1] * Math.PI) / 180))

/**
 * Rutas (R92): los puntos de cada chofer, limpios, se cortan en tramos al cambiar de estado (dentro de un viaje, por
 * la hora de salida y llegada, o fuera) o donde el GPS dejó de grabar.
 */
export async function cargarRutas(periodo: PeriodoRutas, sentido: Sentido | null, chofer: string | null, ver: VerRutas): Promise<DatosRutas> {
  const supabase = await crearClienteServidor()
  const desde = periodo === "hoy" ? inicioDeHoy() : periodo === "7" ? new Date(Date.now() - 7 * DIA) : new Date(Date.now() - 60 * DIA)

  let lotes = supabase.from("trayectos").select("chofer_id, desde, hasta, puntos").gte("hasta", desde.toISOString()).order("desde")
  if (chofer) lotes = lotes.eq("chofer_id", chofer)
  const [resumen, lotesRes] = await Promise.all([cargarRecorridos(), lotes])
  const filas = lotesRes.data ?? []
  const ids = [...new Set(filas.map((l) => l.chofer_id))]
  if (ids.length === 0) return { resumen, tramos: [], choferes: [] }

  // Los viajes que ya salieron (terminados o en ruta), para saber a cuál pertenece cada punto
  const [{ data: viajes }, { data: nombres }] = await Promise.all([
    supabase
      .from("viajes")
      .select("id, chofer_id, sentido, salida_en, llegada_en")
      .in("chofer_id", ids)
      .in("estado", ["finalizado", "en_ruta"])
      .not("salida_en", "is", null)
      .or(`llegada_en.is.null,llegada_en.gte.${desde.toISOString()}`)
      .order("salida_en"),
    supabase.from("perfiles").select("id, nombre").in("id", ids),
  ])
  const ahora = Date.now() / 1000
  const nombreDe = new Map((nombres ?? []).map((n) => [n.id, n.nombre.split(" ")[0]]))

  // Los puntos de cada chofer, en orden: [epoch, lat, lng, precisión]
  const puntosDe = new Map<string, number[][]>()
  for (const l of filas) {
    const lista = puntosDe.get(l.chofer_id) ?? []
    lista.push(...(l.puntos as number[][]))
    puntosDe.set(l.chofer_id, lista)
  }

  const tramos: Tramo[] = []
  for (const [choferId, lista] of puntosDe) {
    lista.sort((a, b) => a[0] - b[0])
    const suyos = (viajes ?? [])
      .filter((v) => v.chofer_id === choferId)
      .map((v) => ({
        id: v.id,
        sentido: v.sentido,
        salida: new Date(v.salida_en as string).getTime() / 1000,
        llegada: v.llegada_en ? new Date(v.llegada_en).getTime() / 1000 : ahora,
      }))
    const viajeEn = (t: number) => suyos.find((v) => t >= v.salida && t <= v.llegada) ?? null
    const nombre = nombreDe.get(choferId) ?? "Chofer"

    const propios: { viaje: (typeof suyos)[number] | null; inicio: number; fin: number; puntos: [number, number][] }[] = []
    let previo: number[] | null = null
    for (const p of lista) {
      if (p[3] > PRECISION_MAX) continue
      if (previo && p[0] > previo[0] && metros(previo, p) / (p[0] - previo[0]) > VELOCIDAD_MAX) continue
      const v = viajeEn(p[0])
      const ultimo = propios.at(-1)
      if (!ultimo || !previo || p[0] - previo[0] > HUECO_S || ultimo.viaje !== v) {
        propios.push({ viaje: v, inicio: p[0], fin: p[0], puntos: [[p[1], p[2]]] })
      } else {
        ultimo.puntos.push([p[1], p[2]])
        ultimo.fin = p[0]
      }
      previo = p
    }

    // El texto del popup: el viaje entero (de la salida a la llegada) o el pedazo de fuera de un viaje
    for (const { viaje: v, inicio, fin, puntos } of propios) {
      tramos.push({
        viaje: v?.id ?? null,
        sentido: v?.sentido ?? null,
        chofer: nombre,
        cuando: v
          ? `${SENTIDOS[v.sentido].corto} · ${fechaHora(v.salida)} · ${duracion((v.llegada - v.salida) / 60)}`
          : `Fuera de un viaje · ${fechaHora(inicio)} · ${duracion((fin - inicio) / 60)}`,
        puntos,
      })
    }
  }

  return {
    resumen,
    tramos: tramos.filter((t) => (sentido ? t.sentido === sentido : ver === "todo" || t.sentido !== null)),
    choferes: (nombres ?? []).map((n) => ({ id: n.id, nombre: n.nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  }
}

export const SENTIDOS_RUTAS = (Object.keys(SENTIDOS) as Sentido[]).map((s) => ({ id: s, titulo: SENTIDOS[s].corto }))
