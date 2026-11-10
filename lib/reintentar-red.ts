"use client"

import { useEffect, useRef, useState } from "react"

import { esErrorDeRed } from "@/lib/nueva/red"
import { registrarError, type InterfazError } from "@/lib/registro-errores"

// Errores de red al volver a la app (§10, R106): Android congela la app en otra app y, al volver, la actualización que
// iba por la mitad muere ("TypeError: network error" con el teléfono en línea). No es falta de internet: basta pedirla de
// nuevo. La pantalla de error lo intenta sola, en silencio, antes de mostrarse.

const INTENTOS = 2 // reintentos solos con internet antes de mostrar la pantalla
const ESPERAS_MS = [600, 2000]
const VENTANA_MS = 30_000 // los intentos se cuentan dentro de esta ventana; pasada, vuelve a empezar

// Vive fuera del componente: cada reintento fallido monta la pantalla de nuevo, con otro error
let ventana = { intentos: 0, desde: 0 }

/**
 * Si el error es de red: con internet, `retry()` solo hasta 2 veces (devuelve true mientras tanto, para mostrar
 * "Reconectando…" y no la pantalla); sin internet, deja ver la pantalla y reintenta solo cuando vuelve la red. Si se
 * rinde, anota "Tras reintentar" (R106): así se ve cuántos errores de red llegó a ver alguien.
 */
export function useReintentarSiEsDeRed(error: unknown, retry: () => void, interfaz: InterfazError) {
  const [reintentando, setReintentando] = useState(false)
  const retryRef = useRef(retry)
  useEffect(() => {
    retryRef.current = retry
  })

  useEffect(() => {
    if (!esErrorDeRed(error)) return

    // Sin internet de verdad: se ve "Sin conexión" y, al volver la red, se intenta solo
    if (!navigator.onLine) {
      const alVolver = () => retryRef.current()
      window.addEventListener("online", alVolver, { once: true })
      return () => window.removeEventListener("online", alVolver)
    }

    const ahora = Date.now()
    if (ahora - ventana.desde > VENTANA_MS) ventana = { intentos: 0, desde: ahora }
    if (ventana.intentos >= INTENTOS) {
      registrarError(error, interfaz, false, "Tras reintentar")
      return
    }
    const espera = ESPERAS_MS[ventana.intentos] ?? 2000
    ventana.intentos++
    // eslint-disable-next-line react-hooks/set-state-in-effect -- muestra "Reconectando…" en lugar de la pantalla
    setReintentando(true)
    const t = setTimeout(() => retryRef.current(), espera)
    return () => clearTimeout(t)
  }, [error, interfaz])

  return reintentando
}
