"use client"

import { useEffect } from "react"

import { mandarPendientes, vigilarVuelta } from "@/lib/registro-errores"

/**
 * R106 (§5.27): en los layouts raíz. Anota cuándo la persona vuelve a la app (para saber si el error vino justo al
 * volver) y manda las anotaciones de error que quedaron en el teléfono sin señal. No dibuja nada.
 */
export function VigiaDeErrores() {
  useEffect(() => {
    const quitar = vigilarVuelta()
    void mandarPendientes()
    const alVolverLaRed = () => void mandarPendientes()
    window.addEventListener("online", alVolverLaRed)
    return () => {
      quitar()
      window.removeEventListener("online", alVolverLaRed)
    }
  }, [])
  return null
}
