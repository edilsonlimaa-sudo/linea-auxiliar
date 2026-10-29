"use client"

import { Plus } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { cn } from "@/lib/utils"

export type PestanaViaje = {
  id: string
  etapa: string // "En ruta", "Recogiendo pasajeros", "Siguiente"…
  titulo: string // el sentido corto
  enCurso: boolean // en ruta o recogiendo: el punto que late
  contenido: React.ReactNode
  accion?: React.ReactNode // la acción principal, al final de la pestaña
}

/**
 * Los viajes abiertos del chofer en pestañas (§5.21): la barra queda pegada arriba con un viaje por pestaña, en orden
 * (en ruta, el que recoge, los próximos), y al final "+" para dejar el siguiente publicado (R11). Cada pestaña
 * muestra solo lo de su viaje, con su acción al final; abajo, pegada, solo la lista de Gina (`pie`). Al cambiar el viaje en foco (salió,
 * terminó) vuelve a él.
 */
export function PestanasViajes({
  pestanas,
  inicial,
  agregar,
  pie,
}: {
  pestanas: PestanaViaje[]
  inicial: string
  agregar: { href: string } | null // sin la cuota del día no se publica (R76)
  pie?: React.ReactNode
}) {
  const [elegida, setElegida] = React.useState({ id: inicial, para: inicial })
  const id = elegida.para !== inicial || !pestanas.some((p) => p.id === elegida.id) ? inicial : elegida.id
  const activa = pestanas.find((p) => p.id === id) ?? pestanas[0]
  const barra = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    barra.current?.querySelector<HTMLElement>(`[data-pestana="${id}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
  }, [id])

  return (
    <>
      <div className="sticky top-14 z-10 -mx-4 border-b bg-background/80 backdrop-blur">
        <div ref={barra} role="tablist" aria-label="Tus viajes" className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
          {pestanas.map((p) => {
            const sel = p.id === activa.id
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                id={`pestana-${p.id}`}
                aria-selected={sel}
                aria-controls={`panel-${p.id}`}
                data-pestana={p.id}
                onClick={() => setElegida({ id: p.id, para: inicial })}
                className={cn(
                  "flex shrink-0 flex-col items-start rounded-2xl border px-3 py-1.5 text-left transition-colors",
                  sel ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground active:bg-muted"
                )}
              >
                <span className={cn("flex items-center gap-1.5 text-xs font-medium", sel ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {p.enCurso ? (
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full rounded-full bg-current opacity-60 motion-safe:animate-ping" />
                      <span className="relative inline-flex size-2 rounded-full bg-current" />
                    </span>
                  ) : null}
                  {p.etapa}
                </span>
                <span className="font-heading text-sm font-semibold whitespace-nowrap">{p.titulo}</span>
              </button>
            )
          })}
          {agregar ? (
            <Link
              href={agregar.href}
              transitionTypes={["nav-forward"]}
              aria-label="Publicar otro viaje"
              className="flex w-12 shrink-0 items-center justify-center rounded-2xl border border-dashed text-primary transition-colors active:bg-muted"
            >
              <Plus className="size-5" />
            </Link>
          ) : null}
        </div>
      </div>

      <div role="tabpanel" id={`panel-${activa.id}`} aria-labelledby={`pestana-${activa.id}`} className="flex flex-col gap-4">
        {activa.contenido}
        {activa.accion}
      </div>

      {pie ? <div className="sticky bottom-16 z-10 -mx-4 mt-auto border-t bg-background/90 px-4 py-3 backdrop-blur">{pie}</div> : null}
    </>
  )
}
