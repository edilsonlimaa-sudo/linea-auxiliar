import { SnowflakeIcon, StarIcon } from "lucide-react"

import { Avatar } from "@/components/foto/avatar"
import type { Chofer } from "@/lib/datos/inicio-pasajero"

/** "❄️ Con aire" (R55) */
export function ChipAire() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-sm font-bold text-secondary-foreground">
      <SnowflakeIcon aria-hidden className="size-4" />
      Con aire
    </span>
  )
}

/**
 * Quién maneja: foto (R54), nombre, reputación y el carro (placa en grande para reconocerlo en la calle).
 * compacto (Mi viaje): solo placa y unidad; el modelo, el color y el aire van a pedido (DetalleCarro).
 */
export function ChoferResumen({ chofer, compacto = false }: { chofer: Chofer; compacto?: boolean }) {
  const v = chofer.vehiculo
  const carro = compacto ? "" : [v?.modelo, v?.color].filter(Boolean).join(" · ")
  return (
    <div className="flex items-center gap-3">
      <Avatar url={chofer.fotoUrl} nombre={chofer.nombre} className={compacto ? "size-12 text-base" : "size-12 text-base"} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 font-bold">
          <span className="truncate">{chofer.nombre}</span>
          {chofer.estrellas !== null ? (
            <span className="inline-flex items-center gap-0.5 text-sm">
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
        <p className="text-sm text-muted-foreground">
          {v?.placa && (
            <span className="mr-2 rounded-md border-2 border-foreground/70 px-1.5 font-mono font-bold tracking-wider text-foreground">
              {v.placa}
            </span>
          )}
          {carro}
          {v?.unidad && `${carro ? " · " : ""}Unidad ${v.unidad}`}
        </p>
        {v?.aire_acondicionado && !compacto && (
          <p className="mt-1">
            <ChipAire />
          </p>
        )}
      </div>
    </div>
  )
}

/** El carro en palabras (modelo, color, aire), para lo que se abre a pedido en Mi viaje */
export function DetalleCarro({ chofer }: { chofer: Chofer }) {
  const v = chofer.vehiculo
  const carro = [v?.modelo, v?.color].filter(Boolean).join(" · ")
  if (!carro && !v?.aire_acondicionado) return null
  return (
    <p className="flex flex-wrap items-center gap-2 px-2">
      {carro && <span className="font-bold">{carro}</span>}
      {v?.aire_acondicionado && <ChipAire />}
    </p>
  )
}

/** Foto del carro en Mi viaje, para reconocerlo al llegar (R54) */
export function FotoCarro({ chofer }: { chofer: Chofer }) {
  const v = chofer.vehiculo
  if (!v?.fotoUrl) return null
  return (
    <figure className="overflow-hidden rounded-2xl border-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado de Supabase Storage, ya liviano (R54) */}
      <img src={v.fotoUrl} alt={`Carro de ${chofer.nombre}: ${[v.modelo, v.color].filter(Boolean).join(" ")}, placa ${v.placa}`} className="aspect-video w-full bg-muted object-cover" />
      <figcaption className="bg-muted px-3 py-2 text-sm">
        Busca este carro · placa <span className="font-mono font-bold tracking-wider">{v.placa}</span>
      </figcaption>
    </figure>
  )
}
