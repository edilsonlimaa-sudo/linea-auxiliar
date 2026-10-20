"use client"

import { BellRingIcon, Loader2Icon, MapPinIcon, XIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { HojaLugar } from "@/components/pasajero/hoja-lugar"
import { Button } from "@/components/ui/button"
import { avisarQueEspero, dejarDeEsperar } from "@/lib/acciones/pasajero"
import { hace } from "@/lib/fechas"
import { haciaEnFrase, type Sentido } from "@/lib/viajes"

/**
 * "Avísame cuando haya una" (R31): sin unidad con puesto en ese sentido, deja la espera (sentido + lugar).
 * Es opcional: para mirar las unidades no hace falta.
 */
export function AvisameCuandoHaya({ sentido, recientes }: { sentido: Sentido; recientes: string[] }) {
  const [hoja, setHoja] = useState(false)
  return (
    <>
      <Button variant="signal" size="lg" className="w-full" onClick={() => setHoja(true)}>
        <BellRingIcon aria-hidden />
        Avísame cuando haya una
      </Button>
      <HojaLugar
        abierta={hoja}
        onCambiar={setHoja}
        titulo={`Te avisamos cuando haya una ${haciaEnFrase(sentido)}`}
        descripcion="¿Dónde estás? Los choferes ven que alguien espera, y al apartar ya tienes tu lugar escrito."
        recientes={recientes}
        textoBoton="Avísame"
        onEnviar={async (datos) => {
          datos.set("sentido", sentido)
          const r = await avisarQueEspero(datos)
          if (r.ok) setHoja(false)
          return r
        }}
      />
    </>
  )
}

/** Ya pidió que le avisen: hacia dónde y dónde, desde cuándo, y dejar de esperar. Vence sola a las 2 h (R35). */
export function EstadoEspera({ sentido, lugar, desde }: { sentido: Sentido; lugar: string | null; desde: string }) {
  const [pendiente, iniciar] = useTransition()

  return (
    <section aria-labelledby="titulo-esperando" className="flex flex-col gap-3 rounded-3xl border-2 border-warning/40 bg-warning-muted p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="relative mt-2 flex size-3 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-3 rounded-full bg-warning" />
        </span>
        <div className="min-w-0">
          <h2 id="titulo-esperando" className="text-lg leading-tight font-bold">
            Te avisamos: esperas para ir {haciaEnFrase(sentido)}
          </h2>
          <p className="mt-1 flex items-start gap-1.5">
            <MapPinIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>{lugar ?? "Tu ubicación GPS"}</span>
          </p>
          <p className="text-[15px] text-muted-foreground">Desde {hace(desde)}. La unidad aparece aquí apenas haya una.</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="self-start" disabled={pendiente} onClick={() => iniciar(async () => void (await dejarDeEsperar()))}>
        {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <XIcon aria-hidden />}
        Ya no estoy esperando
      </Button>
    </section>
  )
}
