import { CheckIcon, HistoryIcon, UsersIcon } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { SENTIDOS, type Sentido } from "@/lib/viajes"

// El sentido va en la dirección (?hacia=centro): así sobrevive al refresco en vivo y a volver atrás
export const HACIA: Record<Sentido, string> = { vg_a_centro: "centro", centro_a_vg: "valle" }
export const sentidoDeHacia = (valor: unknown): Sentido | null =>
  valor === "centro" ? "vg_a_centro" : valor === "valle" ? "centro_a_vg" : null

/**
 * "¿Hacia dónde vas?" (docs/especificacion.md §8): dos botones grandes, cada uno con cuántas unidades van.
 * Cambiar de sentido es un toque y muestra enseguida las unidades de ese sentido.
 */
export function SelectorSentido({ actual, unidades }: { actual: Sentido; unidades: Record<Sentido, number> }) {
  return (
    <nav aria-labelledby="titulo-hacia" className="flex flex-col gap-2">
      <h2 id="titulo-hacia" className="text-xl font-bold">
        ¿Hacia dónde vas?
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(SENTIDOS) as Sentido[]).map((s) => {
          const activo = s === actual
          const n = unidades[s]
          return (
            <Link
              key={s}
              href={`/inicio?hacia=${HACIA[s]}`}
              replace
              scroll={false}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex min-h-18 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-3 py-2 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                activo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
              )}
            >
              <span className="flex items-center gap-1.5 text-lg leading-tight font-bold">
                {activo && <CheckIcon aria-hidden className="size-5" />}
                {SENTIDOS[s].corto}
              </span>
              <span className={cn("text-sm", activo ? "opacity-90" : "text-muted-foreground")}>
                {n === 0 ? "Sin unidades" : n === 1 ? "1 unidad" : `${n} unidades`}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/** Para quien entró a mirar y no a viajar */
export function Atajos() {
  const clase =
    "flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
  return (
    <nav aria-label="Atajos" className="grid grid-cols-2 gap-3">
      <Link href="/choferes" className={clase}>
        <UsersIcon aria-hidden className="size-6 shrink-0 text-primary" />
        Choferes
      </Link>
      <Link href="/mis-viajes" className={clase}>
        <HistoryIcon aria-hidden className="size-6 shrink-0 text-primary" />
        Mis viajes
      </Link>
    </nav>
  )
}
