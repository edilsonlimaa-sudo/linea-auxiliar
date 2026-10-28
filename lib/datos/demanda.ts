// Demanda y oferta del panel (docs/especificacion.md §5.22, R86–R87): el histórico por hora y por día
import type { Database } from "@/lib/database.types"
import { diaDeHoy } from "@/lib/fechas"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"

type Fila = Database["public"]["Functions"]["admin_demanda_oferta"]["Returns"][number]

/** El día en que empezó la lista hacia Valle Grande en producción: antes no había cómo medir esa demanda */
export const INICIO_LISTA = "2026-10-21"

export const PERIODOS = [
  { id: "hoy", titulo: "Hoy" },
  { id: "7", titulo: "7 días" },
  { id: "lista", titulo: "Desde la lista" },
] as const
export const DIAS = [
  { id: "semana", titulo: "Lunes a viernes" },
  { id: "finde", titulo: "Fin de semana" },
  { id: "todos", titulo: "Todos" },
] as const
export type Periodo = (typeof PERIODOS)[number]["id"]
export type Dias = (typeof DIAS)[number]["id"]

const NUMEROS = [
  "valle_quieren", "valle_llevados", "valle_otro", "valle_vencio", "valle_desistio", "centro_llevados", "centro_no_atendidos",
  "valle_salidas", "valle_puestos", "centro_salidas", "centro_puestos", "choferes", "llevados_sin_app",
] as const
export type Numeros = Record<(typeof NUMEROS)[number], number>
export type Hora = Numeros & { hora: number; faltaTransporte: boolean }
export type Dia = Numeros & { dia: string; choferesMax: number }
export type DemandaOferta = {
  desde: string
  hasta: string
  dias: number // días del período que entran en el filtro (para el promedio por hora)
  totales: Numeros
  porHora: Hora[] // promedio por día del filtro; solo las horas con gente o salidas
  porDia: Dia[]
  error: string | null
}

const ceros = (): Numeros => Object.fromEntries(NUMEROS.map((k) => [k, 0])) as Numeros
const sumar = (a: Numeros, b: Numeros) => NUMEROS.forEach((k) => (a[k] += b[k]))

// Fechas "AAAA-MM-DD" (día de Caracas) sin zona: se cuentan a mediodía UTC para no cruzar de día
const aFecha = (d: string) => new Date(`${d}T12:00:00Z`)
const aTexto = (f: Date) => f.toISOString().slice(0, 10)
const masDias = (d: string, n: number) => aTexto(new Date(aFecha(d).getTime() + n * 86_400_000))
const entra = (d: string, dias: Dias) => {
  const finde = [0, 6].includes(aFecha(d).getUTCDay())
  return dias === "todos" || (dias === "finde" ? finde : !finde)
}

/** R87: lo que muestra Demanda y oferta para un período y un filtro de días */
export async function cargarDemandaOferta(periodo: Periodo, dias: Dias): Promise<DemandaOferta> {
  const hasta = diaDeHoy()
  const desde = periodo === "hoy" ? hasta : periodo === "7" ? masDias(hasta, -6) : INICIO_LISTA
  const filtro: Dias = periodo === "hoy" ? "todos" : dias

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("admin_demanda_oferta", { p_desde: desde, p_hasta: hasta })
  const filas: Fila[] = (data ?? []).filter((f) => entra(f.dia, filtro))

  let n = 0
  for (let d = desde; d <= hasta; d = masDias(d, 1)) if (entra(d, filtro)) n += 1

  const totales = ceros()
  const horas = new Map<number, Numeros>()
  const porDia = new Map<string, Dia>()
  for (const f of filas) {
    // "choferes" es por hora: en los totales no se suma (no son personas distintas)
    sumar(totales, { ...f, choferes: 0 })
    sumar(horas.get(f.hora) ?? (horas.set(f.hora, ceros()), horas.get(f.hora)!), f)
    const dia = porDia.get(f.dia) ?? (porDia.set(f.dia, { ...ceros(), dia: f.dia, choferesMax: 0 }), porDia.get(f.dia)!)
    sumar(dia, { ...f, choferes: 0 })
    dia.choferesMax = Math.max(dia.choferesMax, f.choferes)
  }

  const promedio = (x: number) => Math.round((x / Math.max(n, 1)) * 10) / 10
  const porHora = [...horas.entries()]
    // Solo las horas con gente o con salidas (con choferes trabajando y nada más, la fila no dice nada)
    .filter(([, s]) => s.valle_quieren + s.centro_llevados + s.centro_no_atendidos + s.valle_salidas + s.centro_salidas > 0)
    .sort(([a], [b]) => a - b)
    .map(([hora, s]) => {
      const p = Object.fromEntries(NUMEROS.map((k) => [k, promedio(s[k])])) as Numeros
      // Más de la mitad de quienes querían ir a Valle Grande se quedó sin llevar
      return { ...p, hora, faltaTransporte: s.valle_quieren > 0 && s.valle_llevados * 2 < s.valle_quieren }
    })

  return {
    desde,
    hasta,
    dias: n,
    totales,
    porHora,
    porDia: [...porDia.values()].sort((a, b) => b.dia.localeCompare(a.dia)),
    error: error?.message ?? null,
  }
}

/** R86: si la cuenta está marcada de prueba */
export async function esDePrueba(id: string): Promise<boolean> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.from("perfiles").select("de_prueba").eq("id", id).maybeSingle()
  return data?.de_prueba ?? false
}

export type RecorridosResumen = { grabando: boolean; lotes: number; puntos: number; choferes: number; ultimo: string | null }

/** R92: si se graba el recorrido y cuánto llegó en los últimos 7 días (la hora, ya escrita para la pantalla) */
export async function cargarRecorridos(): Promise<RecorridosResumen> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc("admin_recorridos_resumen")
  const r = data?.[0]
  const ultimo = r?.ultimo
    ? new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(new Date(r.ultimo))
    : null
  return { grabando: r?.grabando ?? false, lotes: r?.lotes ?? 0, puntos: r?.puntos ?? 0, choferes: r?.choferes ?? 0, ultimo }
}
