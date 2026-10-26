"use client"

import { useCallback, useSyncExternalStore } from "react"

// R73: "¿Qué haces después?" se pregunta una vez por viaje. Cerrarla es "ahora no": se recuerda en este teléfono
const clave = (viajeId: string) => `despues-ahora-no:${viajeId}`
const EVENTO = "despues-ahora-no"

export function marcarAhoraNo(viajeId: string) {
  try {
    localStorage.setItem(clave(viajeId), "1")
  } catch {}
  window.dispatchEvent(new Event(EVENTO))
}

function leer(viajeId: string): boolean {
  try {
    return localStorage.getItem(clave(viajeId)) === "1"
  } catch {
    return false
  }
}

/** ¿Ya dijo "ahora no" a la pregunta de este viaje? (se decide en el teléfono) */
export function useAhoraNo(viajeId: string): boolean {
  const suscribir = useCallback((avisar: () => void) => {
    window.addEventListener(EVENTO, avisar)
    window.addEventListener("storage", avisar)
    return () => {
      window.removeEventListener(EVENTO, avisar)
      window.removeEventListener("storage", avisar)
    }
  }, [])
  // En el servidor, escondida: así no aparece y desaparece al cargar para quien ya dijo "ahora no"
  return useSyncExternalStore(suscribir, () => leer(viajeId), () => true)
}
