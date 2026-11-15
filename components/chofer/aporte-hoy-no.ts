"use client"

import { useCallback, useSyncExternalStore } from "react"

import { diaDeHoy } from "@/lib/fechas"

// R76: la invitación al aporte del día se cierra con "Hoy no" hasta el día siguiente de Caracas (en este teléfono)
const CLAVE = "aporte-hoy-no"
const EVENTO = "aporte-hoy-no"

export function marcarAporteHoyNo() {
  try {
    localStorage.setItem(CLAVE, diaDeHoy())
  } catch {}
  window.dispatchEvent(new Event(EVENTO))
}

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) === diaDeHoy()
  } catch {
    return false
  }
}

/** ¿Ya dijo "Hoy no" al aporte de hoy? (se decide en el teléfono) */
export function useAporteHoyNo(): boolean {
  const suscribir = useCallback((avisar: () => void) => {
    window.addEventListener(EVENTO, avisar)
    window.addEventListener("storage", avisar)
    return () => {
      window.removeEventListener(EVENTO, avisar)
      window.removeEventListener("storage", avisar)
    }
  }, [])
  // En el servidor, escondida: así no aparece y desaparece al cargar para quien ya dijo "Hoy no"
  return useSyncExternalStore(suscribir, leer, () => true)
}
