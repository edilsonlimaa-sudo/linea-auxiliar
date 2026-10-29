"use client"

import { useState, useTransition } from "react"

import type { Resultado } from "@/lib/acciones/chofer"
import { esErrorDeRed } from "@/lib/nueva/red"

const SIN_CONEXION = "No se pudo enviar: no hay conexión. Toca otra vez cuando vuelva la señal."

/**
 * Ejecuta una acción del chofer en una transición y guarda su error (para mostrarlo junto al botón). Si no llegó al
 * servidor (sin señal), lo dice ahí mismo en vez de caer en la pantalla de error: se reintenta con el mismo botón.
 */
export function useAccion() {
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string>()
  const ejecutar = (accion: () => Promise<Resultado>, alTerminar?: () => void) =>
    iniciar(async () => {
      setError(undefined)
      let r: Resultado
      try {
        r = await accion()
      } catch (e) {
        if (!esErrorDeRed(e)) throw e
        setError(SIN_CONEXION)
        return
      }
      setError(r.error)
      if (r.ok) alTerminar?.()
    })
  return { ejecutar, pendiente, error, limpiar: () => setError(undefined) }
}
