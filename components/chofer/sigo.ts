"use client"

import { useCallback, useSyncExternalStore } from "react"

// R67 "Sigo": el chofer en ruta no pasa (o ya pasó) por alguien que espera en el camino. Solo lo saca de su aviso en
// ese viaje (se recuerda en este teléfono); la persona sigue en la lista para el siguiente carro
const clave = (viajeId: string) => `sigo:${viajeId}`
const EVENTO = "sigo"

function leer(viajeId: string): string {
  try {
    return localStorage.getItem(clave(viajeId)) ?? ""
  } catch {
    return ""
  }
}

export function marcarSigo(viajeId: string, entradaId: string) {
  const ids = leer(viajeId).split(",").filter(Boolean)
  try {
    localStorage.setItem(clave(viajeId), [...ids, entradaId].join(","))
  } catch {}
  window.dispatchEvent(new Event(EVENTO))
}

/** Los anotados en el camino a los que este chofer dijo "Sigo" en este viaje */
export function useSigo(viajeId: string): string[] {
  const suscribir = useCallback((avisar: () => void) => {
    window.addEventListener(EVENTO, avisar)
    window.addEventListener("storage", avisar)
    return () => {
      window.removeEventListener(EVENTO, avisar)
      window.removeEventListener("storage", avisar)
    }
  }, [])
  const texto = useSyncExternalStore(suscribir, () => leer(viajeId), () => "")
  return texto ? texto.split(",") : []
}
