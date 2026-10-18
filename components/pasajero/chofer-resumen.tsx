import { StarIcon } from "lucide-react"

import type { Chofer } from "@/lib/datos/inicio-pasajero"
import { iniciales } from "@/lib/viajes"

/** Quién maneja: iniciales, nombre, reputación y el carro (placa en grande para reconocerlo en la calle) */
export function ChoferResumen({ chofer }: { chofer: Chofer }) {
  const v = chofer.vehiculo
  const carro = [v?.modelo, v?.color].filter(Boolean).join(" · ")
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-lg font-bold text-secondary-foreground">
        {iniciales(chofer.nombre)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 font-bold">
          <span className="truncate">{chofer.nombre}</span>
          {chofer.estrellas !== null ? (
            <span className="inline-flex items-center gap-0.5 text-[15px]">
              <StarIcon aria-hidden className="size-4 fill-signal text-signal" />
              {chofer.estrellas.toFixed(1).replace(".", ",")}
              <span className="font-normal text-muted-foreground">
                ({chofer.calificaciones})<span className="sr-only"> calificaciones</span>
              </span>
            </span>
          ) : (
            <span className="text-sm font-normal text-muted-foreground">Sin calificaciones aún</span>
          )}
        </p>
        <p className="text-[15px] text-muted-foreground">
          {v?.placa && (
            <span className="mr-2 rounded-md border-2 border-foreground/70 px-1.5 font-mono font-bold tracking-wider text-foreground">
              {v.placa}
            </span>
          )}
          {carro}
          {v?.unidad && ` · Unidad ${v.unidad}`}
        </p>
      </div>
    </div>
  )
}
