import { SnowflakeIcon, StarIcon } from "lucide-react"

import { promedioTexto } from "@/components/estrellas"
import { Avatar } from "@/components/foto/avatar"
import { EstadoLinea } from "@/components/pasajero/estado-linea"
import type { ChoferEnServicio } from "@/lib/datos/inicio-pasajero"
import { cn } from "@/lib/utils"

/**
 * "¿Cómo está la línea?" (docs/especificacion.md §8, R7): quién está trabajando ahora y qué hace cada uno.
 * No se separa por sentido: los choferes dan vueltas (van al Centro y vuelven); importa que haya alguien en la
 * ruta y saber quién es. El sentido se escoge recién al pedir.
 */
export function EstadoDeLaLinea({
  choferes,
  aviso,
  titulo = "¿Cómo está la línea?",
  cantidad = (n) => (n === 0 ? "Ningún chofer trabajando ahora" : n === 1 ? "1 chofer trabajando ahora" : `${n} choferes trabajando ahora`),
}: {
  choferes: ChoferEnServicio[]
  aviso: { texto: string } | null
  titulo?: string // el chofer lo ve como "Compañeros en la ruta" (§8)
  cantidad?: (n: number) => string
}) {
  const n = choferes.length
  return (
    <section aria-labelledby="titulo-linea" className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4">
      <h2 id="titulo-linea" className="text-lg font-bold">
        {titulo}
      </h2>
      <p className="flex items-center gap-2.5 text-lg font-bold">
        <span aria-hidden className={cn("size-3 shrink-0 rounded-full", n > 0 ? "bg-success" : "bg-muted-foreground")} />
        {cantidad(n)}
      </p>

      {n > 0 && (
        <ul className="flex flex-col gap-2">
          {choferes.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2.5">
              <Avatar url={c.fotoUrl} nombre={c.nombre} className="size-12 text-base" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 font-bold">
                  <span className="truncate">{c.nombre}</span>
                  {c.estrellas !== null && (
                    <span className="inline-flex items-center gap-0.5 text-[15px]">
                      <StarIcon aria-hidden className="size-4 fill-signal text-signal" />
                      {promedioTexto(c.estrellas)}
                      <span className="sr-only"> estrellas</span>
                    </span>
                  )}
                </p>
                <p className={cn("text-[15px]", c.actividad === "Disponible" ? "text-muted-foreground" : "font-bold text-primary")}>
                  {c.actividad}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  {c.placa && <span className="font-mono font-bold tracking-wider text-foreground">{c.placa}</span>}
                  {c.unidad && <span>Unidad {c.unidad}</span>}
                  {c.aire && (
                    <span className="inline-flex items-center gap-1">
                      <SnowflakeIcon aria-hidden className="size-3.5" />
                      Con aire
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {aviso && <EstadoLinea aviso={aviso} />}
    </section>
  )
}
