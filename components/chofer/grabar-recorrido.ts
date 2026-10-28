"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { recorridoActivo, subirRecorrido } from "@/lib/acciones/chofer"
import { borrarPuntos, guardarPunto, pedirAlmacenamientoPersistente, puntosPendientes, type PuntoRecorrido } from "@/lib/recorrido"

const CADA_LOTE = 100 // ~25 min de puntos cada 15 s
const MAXIMO_LOTE = 500

/**
 * Recorrido de los viajes (R92): mientras se comparte la posición y el admin lo encendió, cada punto se guarda en el
 * teléfono y se sube en lotes: cada ~100 puntos, al salir de la app o dejar de compartir, y al abrirla si quedó algo
 * pendiente. Sin señal, los puntos esperan en el teléfono hasta la próxima vez.
 */
export function useGrabarRecorrido(activo: boolean) {
  const [config, setConfig] = useState<{ grabar: boolean; yo: string | null } | null>(null)
  const nuevos = useRef(0)
  const subiendo = useRef(false)
  const grabando = activo && config?.grabar === true && config.yo !== null
  const yo = config?.yo ?? null

  // Lo que quedó en el teléfono, en lotes, hasta vaciarlo (o hasta que falle: se reintenta después)
  const subir = useCallback(async () => {
    if (!yo || subiendo.current) return
    subiendo.current = true
    try {
      for (;;) {
        const { claves, puntos } = await puntosPendientes(yo, MAXIMO_LOTE)
        if (puntos.length === 0) break
        const r = await subirRecorrido(puntos)
        if (r.error) break
        await borrarPuntos(claves)
        nuevos.current = 0
        if (puntos.length < MAXIMO_LOTE) break
      }
    } catch {
      // Sin señal o sin IndexedDB: queda para la próxima
    } finally {
      subiendo.current = false
    }
  }, [yo])

  useEffect(() => {
    if (!activo) return
    let vigente = true
    recorridoActivo().then(
      (c) => vigente && setConfig(c),
      () => {}
    )
    return () => {
      vigente = false
    }
  }, [activo])

  // Al empezar, lo pendiente; al salir de la app y al dejar de compartir, lo que haya
  useEffect(() => {
    if (!grabando) return
    pedirAlmacenamientoPersistente()
    void subir()
    const alSalir = () => document.visibilityState === "hidden" && void subir()
    document.addEventListener("visibilitychange", alSalir)
    return () => {
      document.removeEventListener("visibilitychange", alSalir)
      void subir()
    }
  }, [grabando, subir])

  const registrar = useCallback(
    (p: GeolocationPosition) => {
      if (!grabando || !yo) return
      const punto: PuntoRecorrido = [Math.round(p.timestamp / 1000), p.coords.latitude, p.coords.longitude, p.coords.accuracy ?? null]
      guardarPunto(yo, punto).then(
        () => {
          nuevos.current += 1
          if (nuevos.current >= CADA_LOTE) void subir()
        },
        () => {}
      )
    },
    [grabando, yo, subir]
  )

  return { grabando, registrar }
}
