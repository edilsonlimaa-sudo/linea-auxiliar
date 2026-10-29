"use client"

import { MoonStar, Sun, X } from "lucide-react"
import { useCallback, useSyncExternalStore } from "react"

import { Button } from "@/components/nueva/ui/button"
import { avisoDeTarifa } from "@/lib/tarifas"

// Avisos de Inicio en la interfaz nueva: la tarifa especial (R80). Por qué se cerró su reserva es una pantalla aparte
// (se-cerro.tsx).
// Cerrados se recuerdan en este teléfono, con las mismas claves que la clásica

const leer = (clave: string) => () => {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}
const guardar = (clave: string, valor: string, evento: string) => {
  try {
    localStorage.setItem(clave, valor)
  } catch {}
  window.dispatchEvent(new Event(evento))
}
function useGuardado(clave: string, evento: string) {
  const suscribir = useCallback(
    (avisar: () => void) => {
      window.addEventListener(evento, avisar)
      return () => window.removeEventListener(evento, avisar)
    },
    [evento]
  )
  return useSyncExternalStore(suscribir, leer(clave), () => null)
}

/** La tarifa especial (R80): solo mientras rige o media hora antes de la nocturna; con ✕ no vuelve ese período */
export function AvisoTarifa() {
  const suscribirReloj = useCallback((avisar: () => void) => {
    const id = setInterval(avisar, 60_000)
    return () => clearInterval(id)
  }, [])
  const ahora = useSyncExternalStore(suscribirReloj, () => Math.floor(Date.now() / 60_000) * 60_000, () => 0)
  const visto = useGuardado("linea-auxiliar:tarifa-vista", "tarifa-vista")
  if (ahora === 0) return null
  const aviso = avisoDeTarifa(new Date(ahora))
  if (!aviso || visto === aviso.clave) return null
  const Icono = aviso.clave.startsWith("domingo") ? Sun : MoonStar
  return (
    <div role="status" className="flex items-start gap-3 rounded-3xl bg-secondary p-4 text-secondary-foreground">
      <Icono className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{aviso.titulo}</p>
        <p className="text-sm text-muted-foreground">{aviso.texto}</p>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label="Cerrar el aviso de tarifa" onClick={() => guardar("linea-auxiliar:tarifa-vista", aviso.clave, "tarifa-vista")}>
        <X className="size-4" />
      </Button>
    </div>
  )
}
