"use client"

import { BusIcon, StarIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Estrellas } from "@/components/estrellas"
import { HojaCalificar } from "@/components/historial/hoja-calificar"
import { Button, buttonVariants } from "@/components/ui/button"
import type { ViajePasajero } from "@/lib/datos/historial"
import { diaYHora } from "@/lib/fechas"
import { SENTIDOS } from "@/lib/viajes"

/** Mis viajes del pasajero (R51): lo que viajó, con quién, en qué carro y cómo lo calificó */
export function ViajesPasajero({ viajes }: { viajes: ViajePasajero[] }) {
  const [calificando, setCalificando] = useState<ViajePasajero | null>(null)

  if (viajes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center">
        <BusIcon aria-hidden className="size-10 text-muted-foreground" />
        <p className="text-base font-bold">Todavía no tienes viajes</p>
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
              <p className="text-base leading-tight font-bold">{diaYHora(v.cuando)}</p>
              {v.seBajoAntes && <p className="text-sm text-muted-foreground">Te bajaste antes del final de la ruta</p>}
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
              <p className="flex items-center gap-2 text-sm">
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

      <HojaCalificar viaje={calificando} onCerrar={() => setCalificando(null)} />
    </>
  )
}
