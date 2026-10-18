"use client"

import { useState, useTransition } from "react"

import type { Resultado } from "@/lib/acciones/chofer"

/** Ejecuta una acción del chofer en una transición y guarda su error (para mostrarlo junto al botón) */
export function useAccion() {
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string>()
  const ejecutar = (accion: () => Promise<Resultado>, alTerminar?: () => void) =>
    iniciar(async () => {
      setError(undefined)
      const r = await accion()
      setError(r.error)
      if (r.ok) alTerminar?.()
    })
  return { ejecutar, pendiente, error, limpiar: () => setError(undefined) }
}
