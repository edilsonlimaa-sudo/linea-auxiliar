"use client"

import { CircleX, Loader2, X } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { dejarCierre, pedirAvisoAlCentro } from "@/lib/acciones/pasajero"
import { pedirPermisoSiFalta } from "@/lib/avisos-celular"
import type { AvisoDeCierre } from "@/lib/datos/inicio-pasajero"
import { SENTIDOS } from "@/lib/viajes"

const TITULO: Record<AvisoDeCierre["motivo"], string> = {
  cancelo: "Tu viaje se canceló",
  salio_lleno: "Te quedaste sin puesto",
  cerrado: "Tu viaje se cerró",
  rechazo: "No pueden pasar por ti",
  no_llego: "Perdiste tu puesto",
}

// Qué pasó, cuando el chofer no dijo un motivo (o el caso no lo lleva)
const QUE_PASO: Record<AvisoDeCierre["motivo"], (chofer: string) => string> = {
  cancelo: (c) => `${c} canceló el viaje.`,
  salio_lleno: (c) => `El carro de ${c} salió lleno antes de que te tocara.`,
  cerrado: (c) => `El viaje de ${c} se cerró sin pasar por ti.`,
  rechazo: (c) => `${c} no puede pasar por ti esta vez.`,
  no_llego: (c) => `${c} marcó que no estabas cuando pasó.`,
}

/**
 * Cuando otro cerró su reserva (canceló, salió lleno, no pudo pasar, no lo encontró): una pantalla de paso que dice qué
 * pasó y por qué (el motivo que escogió el chofer, en palabras del pasajero) y qué hacer ahora: buscar otro carro de ese
 * sentido o, al Centro sin otro carro, pedir el aviso ahí mismo (R94); o ir a Inicio. La ✕ también va a Inicio. Al salir queda vista en este celular.
 */
export function SeCerro({ cierre, porque, conPuesto, enLista }: { cierre: AvisoDeCierre; porque: string | null; conPuesto: number; enLista: boolean }) {
  const [pendiente, iniciar] = React.useTransition()
  const nombre = cierre.chofer.split(" ")[0]
  const alCentro = cierre.sentido === "vg_a_centro"
  const destino = alCentro ? "/n/al-centro" : "/n/a-valle-grande"
  const ir = (a: "/n" | typeof destino) => iniciar(() => dejarCierre(cierre.reservaId, a))
  // Al Centro sin otro carro: el botón pide el aviso de una vez (R94) y vuelve a Inicio
  const avisar = alCentro && conPuesto === 0
  const principal = () =>
    avisar
      ? iniciar(async () => {
          await pedirPermisoSiFalta().catch(() => null)
          await pedirAvisoAlCentro()
          await dejarCierre(cierre.reservaId, "/n")
        })
      : ir(destino)

  const otro = alCentro
    ? conPuesto > 0
      ? { boton: conPuesto === 1 ? "Ver el carro con puesto" : `Ver los ${conPuesto} carros con puesto`, texto: "Hay otro carro al Centro con puesto." }
      : { boton: "Avísame cuando salga un carro", texto: "Ahora no hay otro carro al Centro con puesto. Te avisamos si sale uno en las próximas 2 horas." }
    : enLista
      ? { boton: "Ver mi lugar en la lista", texto: "Sigues en la lista en Gina: el próximo carro te lleva." }
      : { boton: "Anotarme en la lista", texto: conPuesto > 0 ? "Vienen otros carros a Gina." : "Anótate en la lista en Gina para el próximo carro." }

  return (
    <div className="flex min-h-dvh flex-1 flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex justify-end">
        <Button variant="ghost" size="icon" aria-label="Cerrar" disabled={pendiente} onClick={() => ir("/n")}>
          <X className="size-5" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-24 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <CircleX className="size-12" />
          </div>
          <h1 className="font-heading text-3xl font-semibold">{TITULO[cierre.motivo]}</h1>
          <p className="text-muted-foreground">{SENTIDOS[cierre.sentido].largo} · con {cierre.chofer}</p>
        </div>

        <section className="flex w-full flex-col gap-1 rounded-3xl border bg-card p-5 text-left">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Qué pasó</p>
          <p className="font-medium">{porque ?? QUE_PASO[cierre.motivo](nombre)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{otro.texto}</p>
        </section>
      </div>

      <div className="flex flex-col gap-2">
        <Button size="lg" disabled={pendiente} onClick={principal}>
          {pendiente ? <Loader2 className="animate-spin" /> : null}
          {otro.boton}
        </Button>
        <Button variant="ghost" size="lg" disabled={pendiente} onClick={() => ir("/n")}>
          Ir al inicio
        </Button>
      </div>
    </div>
  )
}
