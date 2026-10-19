"use client"

import { BusIcon, StarIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Estrellas } from "@/components/estrellas"
import { CalificarViaje } from "@/components/pasajero/calificar-viaje"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { ViajePasajero } from "@/lib/datos/historial"
import { diaYHora } from "@/lib/fechas"
import { SENTIDOS } from "@/lib/viajes"

/** Mis viajes del pasajero (R51): lo que viajó, con quién, en qué carro y cómo lo calificó */
export function ViajesPasajero({ viajes }: { viajes: ViajePasajero[] }) {
  const [calificando, setCalificando] = useState<ViajePasajero | null>(null)

  if (viajes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-5 py-10 text-center">
        <BusIcon aria-hidden className="size-10 text-muted-foreground" />
        <p className="text-lg font-bold">Todavía no tienes viajes</p>
        <p className="text-muted-foreground">Cuando viajes con la línea, aquí vas a ver cada viaje y su chofer.</p>
        <Link href="/inicio" className={buttonVariants({ className: "mt-2" })}>
          Buscar una unidad
        </Link>
      </div>
    )
  }

  return (
    <>
      <ol className="flex flex-col gap-3">
        {viajes.map((v) => (
          <li key={v.reservaId} className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
            <div>
              <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[v.sentido].largo}</p>
              <p className="text-lg leading-tight font-bold">{diaYHora(v.cuando)}</p>
              {v.seBajoAntes && <p className="text-[15px] text-muted-foreground">Te bajaste antes del final de la ruta</p>}
            </div>
            <p>
              Con <strong>{v.chofer}</strong>
              {(v.unidad || v.placa) && (
                <span className="text-muted-foreground">
                  {v.unidad && ` · Unidad ${v.unidad}`}
                  {v.placa && (
                    <>
                      {" · "}
                      <span className="rounded-md border-2 border-foreground/60 px-1.5 font-mono font-bold tracking-wider text-foreground">{v.placa}</span>
                    </>
                  )}
                </span>
              )}
            </p>
            {v.estrellas !== null ? (
              <p className="flex items-center gap-2 text-[15px]">
                <Estrellas valor={v.estrellas} />
                <span className="text-muted-foreground">Tu calificación</span>
              </p>
            ) : (
              <Button variant="outline" className="self-start" onClick={() => setCalificando(v)}>
                <StarIcon aria-hidden />
                Calificar a {v.chofer.split(" ")[0]}
              </Button>
            )}
          </li>
        ))}
      </ol>

      <Sheet open={calificando !== null} onOpenChange={(abierta) => !abierta && setCalificando(null)}>
        <SheetContent side="bottom" className="mx-auto max-w-2xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Calificar el viaje</SheetTitle>
            <SheetDescription>Cuenta cómo te fue con el chofer.</SheetDescription>
          </SheetHeader>
          <div className="px-5 pt-6 pb-6">
            {calificando && (
              <CalificarViaje
                key={calificando.reservaId}
                desdeHistorial
                pendiente={{
                  reservaId: calificando.reservaId,
                  viajeId: calificando.viajeId,
                  choferId: calificando.choferId,
                  chofer: calificando.chofer,
                  sentido: calificando.sentido,
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
