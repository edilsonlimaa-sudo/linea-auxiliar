"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"

import { guardarPosicion } from "@/lib/acciones/chofer"
import { distanciaMetros, type Punto } from "@/lib/mapa"

export type EstadoUbicacion = "pidiendo" | "activa" | "sin_permiso" | "sin_gps"

const CADA_MS = 15_000 // como mucho cada 15 s (R40)…
const SI_SE_MUEVE_M = 30 // …o antes si se movió más de 30 m
const MINIMO_MS = 5_000
const suscribirse = () => () => {}

/**
 * Mientras el chofer está conectado y con viajes, su teléfono comparte la posición (R40) para el mapa de los
 * pasajeros (R41). Una web app solo puede hacerlo con la app abierta y la pantalla encendida: se pide mantener la
 * pantalla encendida (Wake Lock). El estado lo muestra la franja de arriba (EstadoServicio).
 */
export function useCompartirUbicacion(activo: boolean) {
  const [estadoGps, setEstado] = useState<EstadoUbicacion>("pidiendo")
  // Sin GPS en el aparato no hay nada que pedir (en el servidor se asume que sí)
  const tieneGps = useSyncExternalStore(suscribirse, () => "geolocation" in navigator, () => true)
  const estado: EstadoUbicacion = tieneGps ? estadoGps : "sin_gps"
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
    if (!activo || !tieneGps) return
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setEstado("activa")
        enviar(p)
      },
      (e) => setEstado(e.code === e.PERMISSION_DENIED ? "sin_permiso" : "sin_gps"),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [activo, enviar, intento, tieneGps])

  // Pantalla encendida mientras comparte (se pierde al salir de la app: se vuelve a pedir al volver)
  useEffect(() => {
    if (!activo || estado !== "activa" || !("wakeLock" in navigator)) return
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
  }, [activo, estado])

  const reintentar = useCallback(() => {
    setEstado("pidiendo")
    setIntento((n) => n + 1)
  }, [])

  return { estado, reintentar }
}
