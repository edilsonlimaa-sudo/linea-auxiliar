// Cómo está la conexión del celular (§5.21 "Con mala señal"), para que la app diga cuándo el problema es la internet y
// no se quede muda. Solo en el navegador: lo instala `EstadoDeRed` una vez.
//
// - sinRed: el celular dice que no tiene red (`navigator.onLine`, eventos online/offline).
// - caida: tiene red pero lo último que pidió a la app no llegó (fetch rechazado); se prueba sola cada pocos segundos.
// - lenta: algo pedido a la app tarda más de LENTA_MS (cambiar de pantalla, una acción, el refresco) o el navegador
//   dice que la red es 2G. Con antena pero sin internet (un corte de luz en el Centro) `onLine` sigue en true: esto
//   y `caida` son los que lo notan.
// - navegando: tocó un enlace de la app y la pantalla nueva todavía no llegó (la barrita de arriba).

export type EstadoRed = { sinRed: boolean; caida: boolean; lenta: boolean; navegando: boolean }

const LENTA_MS = 4000
const PROBAR_CADA_MS = 5000

let estado: EstadoRed = { sinRed: false, caida: false, lenta: false, navegando: false }
const oyentes = new Set<() => void>()
const pendientes = new Map<number, number>() // id del pedido → cuándo empezó
let siguienteId = 0
let instalado = false
let finNavegacion: ReturnType<typeof setTimeout> | undefined

function cambiar(parcial: Partial<EstadoRed>) {
  const nuevo = { ...estado, ...parcial }
  if (Object.keys(nuevo).every((k) => nuevo[k as keyof EstadoRed] === estado[k as keyof EstadoRed])) return
  estado = nuevo
  for (const o of oyentes) o()
}

export const suscribirRed = (o: () => void) => (oyentes.add(o), () => void oyentes.delete(o))
export const estadoRed = () => estado
const INICIAL = estado
export const estadoRedServidor = () => INICIAL

type Conexion = { effectiveType?: string; addEventListener?: (e: string, f: () => void) => void }
const conexion = () => (navigator as Navigator & { connection?: Conexion }).connection
const redDe2G = () => /2g/.test(conexion()?.effectiveType ?? "")

function revisar() {
  const ahora = Date.now()
  const tarda = [...pendientes.values()].some((inicio) => ahora - inicio > LENTA_MS)
  cambiar({ sinRed: !navigator.onLine, lenta: tarda || redDe2G() })
}

const esDeLaApp = (entrada: RequestInfo | URL) => {
  try {
    const url = new URL(entrada instanceof Request ? entrada.url : String(entrada), location.href)
    return url.origin === location.origin
  } catch {
    return false
  }
}

/** Una prueba chica a la app: si responde, la conexión volvió */
async function probar() {
  if (!estado.caida && !estado.sinRed) return
  try {
    await fetch("/manifest.webmanifest", { cache: "no-store" })
  } catch {
    // Sigue caída: se vuelve a probar en PROBAR_CADA_MS
  }
}

/** Mira (sin cambiarlos) los pedidos del navegador a la app: cambiar de pantalla, las acciones y los refrescos */
export function instalarRed() {
  if (instalado || typeof window === "undefined") return
  instalado = true
  const original = window.fetch.bind(window)
  window.fetch = async (entrada, init) => {
    if (!esDeLaApp(entrada)) return original(entrada, init)
    const id = siguienteId++
    pendientes.set(id, Date.now())
    try {
      const r = await original(entrada, init)
      cambiar({ caida: false })
      return r
    } catch (e) {
      // Cancelar un pedido (cambió de pantalla antes de que llegara) no es una falla de la red
      if (!(e instanceof DOMException && e.name === "AbortError")) cambiar({ caida: true })
      throw e
    } finally {
      pendientes.delete(id)
      revisar()
    }
  }
  window.addEventListener("online", () => (revisar(), void probar()))
  window.addEventListener("offline", revisar)
  conexion()?.addEventListener?.("change", revisar)
  setInterval(revisar, 1000)
  setInterval(() => void probar(), PROBAR_CADA_MS)
  // Tocó un enlace de la app: la barrita hasta que llegue la pantalla (o 30 s, por si no llega nunca)
  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.origin !== location.origin) return
      if (a.pathname === location.pathname && a.search === location.search) return
      cambiar({ navegando: true })
      clearTimeout(finNavegacion)
      finNavegacion = setTimeout(() => cambiar({ navegando: false }), 30_000)
    },
    true
  )
  revisar()
}

/** Llegó la pantalla nueva (cambió la ruta) */
export function terminoNavegacion() {
  clearTimeout(finNavegacion)
  cambiar({ navegando: false })
}

/** El error es de la red (no llegó al servidor): lo usan las acciones y la pantalla de error */
export function esErrorDeRed(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true
  return error instanceof TypeError && /fetch|network|load failed|conexi/i.test(error.message)
}
