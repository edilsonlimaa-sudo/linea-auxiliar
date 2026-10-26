"use client"

import { Info, MoonStar, Sun, X } from "lucide-react"
import { useCallback, useState, useSyncExternalStore } from "react"

import { Button } from "@/components/nueva/ui/button"
import type { AvisoDeCierre } from "@/lib/datos/inicio-pasajero"
import { avisoDeTarifa } from "@/lib/tarifas"

// Avisos de Inicio en la interfaz nueva: la tarifa especial (R80) y por qué se cerró su reserva (R14, R21, R24, R29).
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

const TEXTO: Record<AvisoDeCierre["motivo"], (chofer: string) => { titulo: string; detalle: string }> = {
  salio_lleno: (c) => ({ titulo: "Te quedaste sin puesto", detalle: `El carro de ${c} salió lleno antes de que te tocara.` }),
  cancelo: (c) => ({ titulo: "Tu viaje se canceló", detalle: `Se canceló el viaje con ${c}.` }),
  cerrado: (c) => ({ titulo: "Tu viaje se cerró", detalle: `El viaje de ${c} se cerró sin pasar por ti.` }),
  rechazo: (c) => ({ titulo: "No pueden pasar por ti", detalle: `${c} no puede pasar por ti esta vez.` }),
  no_llego: (c) => ({ titulo: "Perdiste tu puesto", detalle: `${c} marcó que no estabas cuando pasó.` }),
}

/** Por qué volvió a Inicio cuando otro cerró su reserva (§8) */
export function AvisoCierre({ aviso }: { aviso: AvisoDeCierre }) {
  const visto = useGuardado("linea-auxiliar:aviso-cierre-visto", "aviso-cierre")
  const [cerrado, setCerrado] = useState(false)
  if (cerrado || visto === aviso.reservaId) return null
  const { titulo, detalle } = TEXTO[aviso.motivo](aviso.chofer)
  return (
    <div role="alert" className="flex items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 p-4">
      <Info className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{titulo}</p>
        <p className="text-sm text-muted-foreground">{detalle} Escoge otra forma de ir aquí abajo.</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Cerrar el aviso"
        onClick={() => (setCerrado(true), guardar("linea-auxiliar:aviso-cierre-visto", aviso.reservaId, "aviso-cierre"))}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
