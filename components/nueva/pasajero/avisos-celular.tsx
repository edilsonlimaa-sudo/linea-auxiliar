"use client"

import { BellOff, BellRing, Loader2, Smartphone } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { activarAvisosCelular, desactivarAvisosCelular } from "@/lib/acciones/notificaciones"

type Estado = "cargando" | "sin-soporte" | "iphone" | "bloqueado" | "inactivo" | "activo"

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

async function revisar(): Promise<Estado> {
  if (!soportado()) return esIphoneSinInstalar() ? "iphone" : "sin-soporte"
  if (Notification.permission === "denied") return "bloqueado"
  const registro = await navigator.serviceWorker.register("/sw.js")
  const suscripcion = await registro.pushManager.getSubscription()
  if (!suscripcion) return "inactivo"
  // El aparato puede haber sido de otra cuenta (otra persona usó el teléfono): queda a nombre de quien está ahora
  await activarAvisosCelular(datosDe(suscripcion))
  return "activo"
}

/** Al cerrar sesión: este celular deja de recibir los avisos de la cuenta (R90) */
export async function apagarAvisosDeEsteCelular() {
  if (!("serviceWorker" in navigator)) return
  const registro = await navigator.serviceWorker.getRegistration()
  const suscripcion = await registro?.pushManager.getSubscription()
  if (!suscripcion) return
  await desactivarAvisosCelular(suscripcion.endpoint)
  await suscripcion.unsubscribe()
}

/**
 * Avisos en el celular (R90), arriba de la pestaña Notificaciones: el permiso se pide solo al tocar "Avisarme en el
 * celular". Explica qué hacer si el teléfono lo bloqueó o si es un iPhone sin la app instalada. Ya activados, no se ve.
 */
export function AvisosCelular() {
  const [estado, setEstado] = React.useState<Estado>("cargando")
  const [error, setError] = React.useState<string>()
  const [pendiente, iniciar] = React.useTransition()

  React.useEffect(() => {
    let vigente = true
    revisar()
      .then((e) => vigente && setEstado(e))
      .catch(() => vigente && setEstado("sin-soporte"))
    return () => {
      vigente = false
    }
  }, [])

  const activar = () =>
    iniciar(async () => {
      setError(undefined)
      try {
        const permiso = await Notification.requestPermission()
        if (permiso !== "granted") return setEstado(permiso === "denied" ? "bloqueado" : "inactivo")
        const registro = await navigator.serviceWorker.register("/sw.js")
        await navigator.serviceWorker.ready
        const suscripcion = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveEnBytes(CLAVE) })
        const r = await activarAvisosCelular(datosDe(suscripcion))
        if (r.error) return setError(r.error)
        setEstado("activo")
      } catch {
        setError("No pudimos activarlos en este celular. Intenta de nuevo.")
      }
    })

  // Activados, la tarjeta no aparece: la app no ofrece apagarlos (quien no los quiera, los bloquea en el teléfono)
  if (estado === "cargando" || estado === "sin-soporte" || estado === "activo") return null

  const textos: Record<"iphone" | "bloqueado" | "inactivo", { icono: React.ReactNode; titulo: string; texto: string }> = {
    inactivo: {
      icono: <BellRing className="size-5" />,
      titulo: "Recibe los avisos en tu celular",
      texto: "Te avisamos aunque la app esté cerrada.",
    },
    bloqueado: {
      icono: <BellOff className="size-5" />,
      titulo: "Los avisos están bloqueados en este celular",
      texto: "Para activarlos, abre los ajustes del navegador, busca Notificaciones y permite esta app.",
    },
    iphone: {
      icono: <Smartphone className="size-5" />,
      titulo: "Para recibir avisos en el iPhone",
      texto: "Primero agrega la app a tu pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ese ícono.",
    },
  }
  const t = textos[estado]

  return (
    <section aria-label={t.titulo} className="flex flex-col gap-3 rounded-3xl border border-primary/30 bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">{t.icono}</div>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold">{t.titulo}</p>
          <p className="text-sm text-muted-foreground">{t.texto}</p>
        </div>
      </div>
      {estado === "inactivo" ? (
        <Button disabled={pendiente} onClick={activar}>
          {pendiente ? <Loader2 className="animate-spin" /> : <BellRing />}
          Avisarme en el celular
        </Button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
