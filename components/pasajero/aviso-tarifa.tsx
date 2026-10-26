"use client"

import { MoonStarIcon, SunIcon, XIcon } from "lucide-react"
import { useCallback, useSyncExternalStore } from "react"

import { avisoDeTarifa } from "@/lib/tarifas"

const CLAVE = "linea-auxiliar:tarifa-vista"
const EVENTO = "tarifa-vista"
const leerVisto = () => {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

/**
 * Aviso de tarifa especial en Inicio del pasajero (R80): aparece solo cuando rige (domingo, de noche) o media hora antes
 * de la nocturna. Con ✕ no vuelve en esa noche o ese domingo (se recuerda en este teléfono). La tarifa normal no se avisa.
 */
export function AvisoTarifa() {
  // La hora del teléfono, cada minuto (en el servidor no se muestra nada)
  const suscribirReloj = useCallback((avisar: () => void) => {
    const id = setInterval(avisar, 60_000)
    return () => clearInterval(id)
  }, [])
  const ahora = useSyncExternalStore(suscribirReloj, () => Math.floor(Date.now() / 60_000) * 60_000, () => 0)
  const suscribirVisto = useCallback((avisar: () => void) => {
    window.addEventListener(EVENTO, avisar)
    return () => window.removeEventListener(EVENTO, avisar)
  }, [])
  const visto = useSyncExternalStore(suscribirVisto, leerVisto, () => null)

  if (ahora === 0) return null
  const aviso = avisoDeTarifa(new Date(ahora))
  if (!aviso || visto === aviso.clave) return null
  const Icono = aviso.clave.startsWith("domingo") ? SunIcon : MoonStarIcon

  const cerrar = () => {
    try {
      localStorage.setItem(CLAVE, aviso.clave)
    } catch {}
    window.dispatchEvent(new Event(EVENTO))
  }

  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border-2 border-signal/60 bg-signal/15 px-4 py-3">
      <Icono aria-hidden className="mt-0.5 size-5 shrink-0 text-foreground" />
      <p className="min-w-0 flex-1 leading-snug">
        <strong className="block">{aviso.titulo}</strong>
        <span className="text-sm text-muted-foreground">{aviso.texto}</span>
      </p>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar el aviso de tarifa"
        className="grid size-9 shrink-0 place-items-center rounded-full outline-none hover:bg-signal/20 focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <XIcon aria-hidden className="size-4" />
      </button>
    </div>
  )
}
