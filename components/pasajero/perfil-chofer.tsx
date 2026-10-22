"use client"

import { ChevronRightIcon, SnowflakeIcon, StarIcon } from "lucide-react"
import { useState } from "react"

import { ChoferResumen, FotoCarro } from "@/components/pasajero/chofer-resumen"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Chofer } from "@/lib/datos/inicio-pasajero"
import { iniciales, nombreCorto } from "@/lib/viajes"

const promedio = (n: number) => n.toFixed(1).replace(".", ",")

/**
 * Quién maneja, una sola vez en la tarjeta de la unidad (§8): foto, nombre corto, ★, placa, unidad y aire. Al tocarlo
 * se abre su perfil en una hoja: nombre completo, el carro y la foto del carro (R54, R55).
 */
export function PerfilChofer({ chofer }: { chofer: Chofer }) {
  const [abierto, setAbierto] = useState(false)
  const v = chofer.vehiculo
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Ver el perfil de ${chofer.nombre}`}
        className="flex w-full items-center gap-3 rounded-2xl bg-muted px-3 py-2 text-left outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <Avatar className="size-11">
          {chofer.fotoUrl && <AvatarImage src={chofer.fotoUrl} alt="" />}
          <AvatarFallback className="bg-secondary font-bold text-secondary-foreground">{iniciales(chofer.nombre)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 font-bold">
            <span className="truncate">{nombreCorto(chofer.nombre)}</span>
            {chofer.estrellas !== null && (
              <span className="inline-flex items-center gap-0.5 text-[15px]">
                <StarIcon aria-hidden className="size-4 fill-signal text-signal" />
                {promedio(chofer.estrellas)}
                <span className="sr-only"> estrellas</span>
              </span>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {v?.placa && <span className="font-mono font-bold tracking-wider text-foreground">{v.placa}</span>}
            {v?.unidad && <span>Unidad {v.unidad}</span>}
            {v?.aire_acondicionado && (
              <span className="inline-flex items-center gap-1">
                <SnowflakeIcon aria-hidden className="size-3.5" /> Aire
              </span>
            )}
          </span>
        </span>
        <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Quién maneja</SheetTitle>
            <SheetDescription className="sr-only">Perfil del chofer y su carro</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-5 pb-6">
            <ChoferResumen chofer={chofer} />
            <FotoCarro chofer={chofer} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
