// Avisos en el celular (R90, R93): lo del navegador, igual para el pasajero y el admin. Solo se usa en componentes cliente.
import { activarAvisosCelular, desactivarAvisosCelular } from "@/lib/acciones/notificaciones"

export type EstadoAvisos = "cargando" | "sin-soporte" | "iphone" | "bloqueado" | "inactivo" | "activo"

const CLAVE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

// La clave pública VAPID viene en base64 "de URL"; el navegador la quiere en bytes
function claveEnBytes(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4)
  const binario = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(binario, (c) => c.charCodeAt(0))
}

const soportado = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && Boolean(CLAVE)
const esIphoneSinInstalar = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches

function datosDe(s: PushSubscription) {
  const j = s.toJSON()
  return { endpoint: s.endpoint, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "" }
}

/** En qué está este aparato. Si ya estaba inscrito, queda a nombre de quien está ahora (otra persona pudo usarlo) */
export async function revisarAvisos(): Promise<EstadoAvisos> {
  if (!soportado()) return esIphoneSinInstalar() ? "iphone" : "sin-soporte"
  if (Notification.permission === "denied") return "bloqueado"
  const registro = await navigator.serviceWorker.register("/sw.js")
  const suscripcion = await registro.pushManager.getSubscription()
  if (!suscripcion) return "inactivo"
  await activarAvisosCelular(datosDe(suscripcion))
  return "activo"
}

/** Pide el permiso (solo después de un toque) e inscribe este aparato */
export async function activarAvisos(): Promise<{ estado: EstadoAvisos; error?: string }> {
  try {
    const permiso = await Notification.requestPermission()
    if (permiso !== "granted") return { estado: permiso === "denied" ? "bloqueado" : "inactivo" }
    const registro = await navigator.serviceWorker.register("/sw.js")
    await navigator.serviceWorker.ready
    const suscripcion = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveEnBytes(CLAVE) })
    const r = await activarAvisosCelular(datosDe(suscripcion))
    return r.error ? { estado: "inactivo", error: r.error } : { estado: "activo" }
  } catch {
    return { estado: "inactivo", error: "No pudimos activarlos en este aparato. Intenta de nuevo." }
  }
}

/** Al cerrar sesión: este aparato deja de recibir los avisos de la cuenta (R90) */
export async function apagarAvisosDeEsteCelular() {
  if (!("serviceWorker" in navigator)) return
  const registro = await navigator.serviceWorker.getRegistration()
  const suscripcion = await registro?.pushManager.getSubscription()
  if (!suscripcion) return
  await desactivarAvisosCelular(suscripcion.endpoint)
  await suscripcion.unsubscribe()
}
