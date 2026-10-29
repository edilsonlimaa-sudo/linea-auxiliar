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
 * (en ruta, el que recoge, los próximos), y al final "+" para dejar el siguiente publicado (R11). Los viajes están todos
 * en la página, uno al lado del otro: se pasa de uno a otro deslizando de lado (scroll-snap del navegador, sin cargar
 * nada) o tocando su pestaña, y la barra sigue al que se ve. Cada uno con su acción al final; abajo, pegada, solo la
 * lista de Gina (`pie`). Al cambiar el viaje en foco (salió, terminó) vuelve a él.
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
  const orden = pestanas.map((p) => p.id).join()
  // Cambia el foco o los viajes (salió, terminó): vuelve al viaje en foco
  const clave = `${inicial}|${orden}`
  const [elegida, setElegida] = React.useState({ id: inicial, clave })
  const id = elegida.clave === clave ? elegida.id : inicial
  const setId = (x: string) => setElegida({ id: x, clave })
  const montado = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  const [alto, setAlto] = React.useState<number>()
  const barra = React.useRef<HTMLDivElement>(null)
  const carril = React.useRef<HTMLDivElement>(null)
  const indice = Math.max(
    0,
    pestanas.findIndex((p) => p.id === id)
  )

  const irA = React.useCallback((i: number, suave: boolean) => {
    const c = carril.current
    if (c) c.scrollTo({ left: i * c.clientWidth, behavior: suave ? "smooth" : "instant" })
  }, [])

  // Al abrir y cuando cambia el foco o los viajes, el carril va al viaje en foco, sin animación
  const indiceInicial = Math.max(
    0,
    pestanas.findIndex((p) => p.id === inicial)
  )
  React.useLayoutEffect(() => irA(indiceInicial, false), [clave, indiceInicial, irA])

  // La barra sigue al viaje que se ve
  const alDeslizar = () => {
    const c = carril.current
    if (!c) return
    const p = pestanas[Math.round(c.scrollLeft / c.clientWidth)]
    if (p && p.id !== id) setId(p.id)
  }

  React.useEffect(() => {
    barra.current?.querySelector<HTMLElement>(`[data-pestana="${id}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
  }, [id])

  // El carril toma el alto del viaje que se ve (sin hueco debajo de uno corto)
  React.useEffect(() => {
    const panel = carril.current?.children[indice] as HTMLElement | undefined
    if (!panel) return
    const medir = () => setAlto(panel.offsetHeight)
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(panel)
    return () => obs.disconnect()
  }, [indice, orden])

  return (
    <>
      <div className="sticky top-14 z-10 -mx-4 border-b bg-background/80 backdrop-blur">
        <div ref={barra} role="tablist" aria-label="Tus viajes" className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
          {pestanas.map((p, i) => {
            const sel = i === indice
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                id={`pestana-${p.id}`}
                aria-selected={sel}
                aria-controls={`panel-${p.id}`}
                data-pestana={p.id}
                onClick={() => (setId(p.id), irA(i, true))}
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

      {/* Antes de hidratar el carril está en el primero: si el foco es otro, no se muestra hasta ubicarlo */}
      <div
        ref={carril}
        onScroll={alDeslizar}
        style={{ height: alto }}
        className={cn(
          "-mx-4 flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none]",
          !montado && pestanas[0]?.id !== inicial && "invisible"
        )}
      >
        {pestanas.map((p, i) => (
          <div
            key={p.id}
            role="tabpanel"
            id={`panel-${p.id}`}
            aria-labelledby={`pestana-${p.id}`}
            inert={i !== indice}
            className="flex w-full shrink-0 snap-start snap-always flex-col gap-4 px-4 pb-1"
          >
            {p.contenido}
            {p.accion}
          </div>
        ))}
      </div>

      {/* Justo encima de la barra de la app: su alto (4rem), su borde y el área segura del celular */}
      {pie ? <div className="sticky bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] z-10 -mx-4 mt-auto border-t bg-background/90 px-4 py-3 backdrop-blur">{pie}</div> : null}
    </>
  )
}
