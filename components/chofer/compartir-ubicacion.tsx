"use client"

import { LocateFixedIcon, LocateOffIcon, Loader2Icon } from "lucide-react"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { guardarPosicion } from "@/lib/acciones/chofer"
import { distanciaMetros, type Punto } from "@/lib/mapa"
import { cn } from "@/lib/utils"

type Estado = "pidiendo" | "activa" | "sin_permiso" | "sin_gps"

const CADA_MS = 15_000 // como mucho cada 15 s (R40)…
const SI_SE_MUEVE_M = 30 // …o antes si se movió más de 30 m
const MINIMO_MS = 5_000
const suscribirse = () => () => {}

/**
 * Mientras el chofer está conectado y con viajes, su teléfono comparte la posición (R40) para el mapa de los
 * pasajeros (R41). Una web app solo puede hacerlo con la app abierta y la pantalla encendida: se pide mantener la
 * pantalla encendida (Wake Lock) y se le dice al chofer.
 */
export function CompartirUbicacion() {
  const [estadoGps, setEstado] = useState<Estado>("pidiendo")
  // Sin GPS en el aparato no hay nada que pedir (en el servidor se asume que sí)
  const tieneGps = useSyncExternalStore(suscribirse, () => "geolocation" in navigator, () => true)
  const estado: Estado = tieneGps ? estadoGps : "sin_gps"
  const [intento, setIntento] = useState(0)
  const ultimo = useRef<{ punto: Punto; en: number } | null>(null)

  const enviar = useCallback((p: GeolocationPosition) => {
    const punto = { lat: p.coords.latitude, lng: p.coords.longitude }
    const ahora = Date.now()
    const previo = ultimo.current
    const transcurrido = previo ? ahora - previo.en : Infinity
    const movido = previo ? distanciaMetros(previo.punto, punto) : Infinity
    if (transcurrido < CADA_MS && !(movido > SI_SE_MUEVE_M && transcurrido >= MINIMO_MS)) return
    ultimo.current = { punto, en: ahora }
    void guardarPosicion(punto.lat, punto.lng, p.coords.accuracy ?? null)
  }, [])

  // GPS
  useEffect(() => {
    if (!tieneGps) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setEstado("activa")
        enviar(p)
      },
      (e) => setEstado(e.code === e.PERMISSION_DENIED ? "sin_permiso" : "sin_gps"),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enviar, intento, tieneGps])

  // Pantalla encendida mientras comparte (se pierde al salir de la app: se vuelve a pedir al volver)
  useEffect(() => {
    if (estado !== "activa" || !("wakeLock" in navigator)) return
    let bloqueo: WakeLockSentinel | undefined
    const pedir = () => {
      if (document.visibilityState !== "visible") return
      navigator.wakeLock.request("screen").then(
        (b) => (bloqueo = b),
        () => {}
      )
    }
    pedir()
    document.addEventListener("visibilitychange", pedir)
    return () => {
      document.removeEventListener("visibilitychange", pedir)
      void bloqueo?.release()
    }
  }, [estado])

  const activa = estado === "activa"
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-2xl border-2 px-4 py-2.5",
        activa ? "border-success/40 bg-success-muted" : estado === "pidiendo" ? "bg-muted" : "border-warning/50 bg-warning-muted"
      )}
    >
      {estado === "pidiendo" ? (
        <Loader2Icon aria-hidden className="mt-0.5 size-5 shrink-0 animate-spin" />
      ) : activa ? (
        <LocateFixedIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
      ) : (
        <LocateOffIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {estado === "pidiendo"
            ? "Buscando tu ubicación…"
            : activa
              ? "Tus pasajeros ven por dónde vas"
              : estado === "sin_permiso"
                ? "Tus pasajeros no ven por dónde vas"
                : "No se pudo leer tu GPS"}
        </p>
        <p className="text-[15px] text-muted-foreground">
          {activa
            ? "Deja la app abierta con la pantalla encendida."
            : estado === "sin_permiso"
              ? "Permite la ubicación para esta página en tu navegador."
              : estado === "sin_gps"
                ? "Revisa que el GPS esté encendido."
                : "Acepta el permiso de ubicación si te lo pide."}
        </p>
        {(estado === "sin_permiso" || estado === "sin_gps") && (
          <Button variant="outline" size="sm" className="mt-2" onClick={() => (setEstado("pidiendo"), setIntento((n) => n + 1))}>
            Intentar de nuevo
          </Button>
        )}
      </div>
    </div>
  )
}
