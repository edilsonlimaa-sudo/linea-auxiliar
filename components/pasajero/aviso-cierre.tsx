"use client"

import { InfoIcon, XIcon } from "lucide-react"
import { useState, useSyncExternalStore } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { AvisoDeCierre } from "@/lib/datos/inicio-pasajero"

const CLAVE = "linea-auxiliar:aviso-cierre-visto"
const leerVisto = () => {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}
const suscribirse = () => () => {}

const TEXTO: Record<AvisoDeCierre["motivo"], (chofer: string) => { titulo: string; detalle: string }> = {
  salio_lleno: (c) => ({ titulo: "Te quedaste sin puesto", detalle: `El carro de ${c} salió lleno antes de que te tocara. Avisa abajo que estás esperando y escoge otra unidad.` }),
  cancelo: (c) => ({ titulo: "Tu viaje se canceló", detalle: `${c} canceló el viaje. Avisa abajo que estás esperando y escoge otra unidad.` }),
  rechazo: (c) => ({ titulo: "No pueden pasar por ti", detalle: `${c} no puede pasar por ti esta vez. Avisa abajo que estás esperando y escoge otra unidad.` }),
  no_llego: (c) => ({ titulo: "Perdiste tu puesto", detalle: `${c} marcó que no estabas cuando pasó. Si todavía quieres ir, avisa abajo que estás esperando y escoge otra unidad.` }),
}

/**
 * Explica por qué el pasajero volvió a Inicio cuando otro cerró su reserva (§8; R14, R21, R24, R29).
 * Se puede cerrar; lo cerrado se recuerda en este celular. La base lo deja de enviar a los 30 min.
 */
export function AvisoCierre({ aviso }: { aviso: AvisoDeCierre }) {
  const visto = useSyncExternalStore(suscribirse, leerVisto, () => null)
  const [cerrado, setCerrado] = useState(false)
  if (cerrado || visto === aviso.reservaId) return null
  const { titulo, detalle } = TEXTO[aviso.motivo](aviso.chofer)

  const cerrar = () => {
    setCerrado(true)
    try {
      localStorage.setItem(CLAVE, aviso.reservaId)
    } catch {}
  }

  return (
    <Alert variant="warning" className="pr-14">
      <InfoIcon aria-hidden />
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription>{detalle}</AlertDescription>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar aviso"
        className="absolute top-2 right-2 grid size-11 place-items-center rounded-full text-foreground hover:bg-foreground/10 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
      >
        <XIcon aria-hidden className="size-5" />
      </button>
    </Alert>
  )
}
