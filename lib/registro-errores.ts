// Registro de errores (docs/especificacion.md §5.27, R106): cada pantalla de error se anota en la base para el admin.
// Solo en el navegador. Va directo a Supabase (rpc registrar_error) y no por el servidor de la app: si lo que falló fue
// la app en Vercel, la anotación igual llega. Sin señal queda en el teléfono y sale la próxima vez que la app abra.
import { crearClienteNavegador } from "@/lib/supabase/cliente-navegador"
import { esErrorDeRed } from "@/lib/nueva/red"

export type InterfazError = "clasica" | "nueva" | "global"

type Anotacion = {
  interfaz: InterfazError
  tipo: "version" | "red" | "otro"
  pantalla: string
  mensaje: string
  digest: string | null
  version: string | null
  aparato: string | null
  en_linea: boolean | null
  volvio_hace: number | null
  ocurrio_en: string
}

const PENDIENTES = "errores-pendientes" // localStorage: lo que no se pudo mandar (como mucho 10)
const RECIENTES = "errores-recientes" // sessionStorage: el mismo error en la misma pantalla, una vez por minuto
const VOLVIO = "__lineaVolvioEn" // window: cuándo volvió a la app por última vez (lo pone VigiaDeErrores)

const VERSION = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null

function leer<T>(almacen: Storage, clave: string, vacio: T): T {
  try {
    return (JSON.parse(almacen.getItem(clave) ?? "null") as T) ?? vacio
  } catch {
    return vacio
  }
}
function guardar(almacen: Storage, clave: string, valor: unknown) {
  try {
    almacen.setItem(clave, JSON.stringify(valor))
  } catch {
    // Sin almacenamiento (modo privado lleno): se pierde, no importa
  }
}

async function mandar(a: Anotacion) {
  const { error } = await crearClienteNavegador().rpc("registrar_error", {
    p_interfaz: a.interfaz,
    p_tipo: a.tipo,
    p_pantalla: a.pantalla,
    p_mensaje: a.mensaje,
    p_digest: a.digest ?? undefined,
    p_version: a.version ?? undefined,
    p_aparato: a.aparato ?? undefined,
    p_en_linea: a.en_linea ?? undefined,
    p_volvio_hace: a.volvio_hace ?? undefined,
    p_ocurrio_en: a.ocurrio_en,
  })
  if (error) throw error
}

function aPendientes(a: Anotacion) {
  guardar(localStorage, PENDIENTES, [...leer<Anotacion[]>(localStorage, PENDIENTES, []), a].slice(-10))
}

/**
 * Anota una pantalla de error (una vez por minuto el mismo error en la misma pantalla). Nunca lanza. `deVersion`: lo
 * dice useRecargarSiEsDeVersion (que lo llama). `nota` va delante del mensaje: "Tras reintentar" (useReintentarSiEsDeRed)
 * separa los errores de red que la persona llegó a ver de los que se arreglaron solos
 */
export function registrarError(error: unknown, interfaz: InterfazError, deVersion: boolean, nota?: string) {
  if (typeof window === "undefined") return
  try {
    const e = error instanceof Error ? error : new Error(String(error))
    const pantalla = window.location.pathname
    const mensaje = `${nota ? `${nota}: ` : ""}${e.name}: ${e.message}`.slice(0, 500)
    const clave = `${pantalla}|${mensaje}`
    const recientes = leer<Record<string, number>>(sessionStorage, RECIENTES, {})
    if (Date.now() - (recientes[clave] ?? 0) < 60_000) return
    guardar(sessionStorage, RECIENTES, { ...recientes, [clave]: Date.now() })

    const volvioEn = (window as unknown as Record<string, number | undefined>)[VOLVIO]
    const a: Anotacion = {
      interfaz,
      tipo: deVersion ? "version" : esErrorDeRed(e) ? "red" : "otro",
      pantalla,
      mensaje,
      digest: (e as Error & { digest?: string }).digest ?? null,
      version: VERSION,
      aparato: navigator.userAgent.slice(0, 300),
      en_linea: navigator.onLine,
      volvio_hace: volvioEn ? Math.round((Date.now() - volvioEn) / 1000) : null,
      ocurrio_en: new Date().toISOString(),
    }
    if (!navigator.onLine) return aPendientes(a)
    mandar(a).catch(() => aPendientes(a))
  } catch {
    // Anotar nunca debe romper la pantalla de error
  }
}

/** Manda lo que quedó pendiente (sin señal). Lo llama VigiaDeErrores al abrir la app y al volver la red. */
export async function mandarPendientes() {
  if (typeof window === "undefined" || !navigator.onLine) return
  const lista = leer<Anotacion[]>(localStorage, PENDIENTES, [])
  if (!lista.length) return
  guardar(localStorage, PENDIENTES, [])
  const fallaron: Anotacion[] = []
  for (const a of lista) await mandar(a).catch(() => fallaron.push(a))
  if (fallaron.length) guardar(localStorage, PENDIENTES, [...fallaron, ...leer<Anotacion[]>(localStorage, PENDIENTES, [])].slice(-10))
}

/** Lo instala VigiaDeErrores: anota cuándo la persona vuelve a la app (de otra app o con la pantalla apagada) */
export function vigilarVuelta() {
  const alVolver = () => {
    if (document.visibilityState === "visible") (window as unknown as Record<string, number>)[VOLVIO] = Date.now()
  }
  document.addEventListener("visibilitychange", alVolver)
  return () => document.removeEventListener("visibilitychange", alVolver)
}
