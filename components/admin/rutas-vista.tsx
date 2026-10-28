"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { MapaRutas } from "@/components/admin/mapa-rutas"
import type { Tramo } from "@/lib/datos/rutas"
import { COLOR_FUERA_DE_VIAJE, COLOR_SENTIDO } from "@/lib/mapa"
import { cn } from "@/lib/utils"
import { SENTIDOS } from "@/lib/viajes"

type Dia = { dia: string; texto: string; choferes: { id: string; nombre: string; tramos: Tramo[] }[] }

// Los días, el más nuevo primero; en cada día, cada chofer con sus tramos en orden (como pasaron)
function porDia(tramos: Tramo[]): Dia[] {
  const dias = new Map<string, Dia>()
  for (const t of tramos) {
    const d = dias.get(t.dia) ?? { dia: t.dia, texto: t.diaTexto, choferes: [] }
    dias.set(t.dia, d)
    let c = d.choferes.find((x) => x.id === t.choferId)
    if (!c) d.choferes.push((c = { id: t.choferId, nombre: t.chofer, tramos: [] }))
    c.tramos.push(t)
  }
  return [...dias.values()].sort((a, b) => b.dia.localeCompare(a.dia))
}

/**
 * Rutas (R92): el mapa y, debajo, los mismos tramos como bloques en orden, para leer la cronología. Escoger un bloque
 * lleva el mapa a ese tramo; tocar una línea en el mapa marca su bloque.
 */
export function RutasVista({ tramos }: { tramos: Tramo[] }) {
  const [elegido, setElegido] = useState<string | null>(null)
  const dias = useMemo(() => porDia(tramos), [tramos])
  const lista = useRef<HTMLDivElement>(null)

  // Escogido en el mapa: abre su día si estaba cerrado y lo muestra
  useEffect(() => {
    if (!elegido) return
    const bloque = lista.current?.querySelector<HTMLElement>(`[data-tramo="${elegido}"]`)
    const dia = bloque?.closest("details")
    if (dia && !dia.open) dia.open = true
    bloque?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [elegido])

  const escoger = (id: string) => {
    setElegido((actual) => (actual === id ? null : id))
    document.getElementById("mapa-rutas")?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }

  return (
    <>
      <div id="mapa-rutas">
        <MapaRutas tramos={tramos} elegido={elegido} onElegir={setElegido} />
      </div>
      <section aria-labelledby="titulo-cronologia" className="flex flex-col gap-3">
        <div>
          <h2 id="titulo-cronologia" className="text-base font-bold">
            En orden
          </h2>
          <p className="text-sm text-muted-foreground">Cada bloque es un tramo del mapa: puntos seguidos del mismo chofer, sin cortes del GPS.</p>
        </div>
        <div ref={lista} className="flex flex-col gap-3">
          {dias.map((d, i) => (
            <details key={d.dia} open={i === 0} className="group rounded-2xl border-2 bg-card">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 py-2 font-bold capitalize">
                {d.texto}
                <span className="text-sm font-normal text-muted-foreground normal-case">
                  {d.choferes.reduce((n, c) => n + c.tramos.length, 0)} bloques
                </span>
              </summary>
              <div className="flex flex-col gap-4 border-t-2 p-3">
                {d.choferes.map((c) => (
                  <div key={c.id} className="flex flex-col gap-1.5">
                    <h3 className="font-bold">{c.nombre}</h3>
                    <ol className="flex flex-col gap-1.5">
                      {c.tramos.map((t, j) => (
                        <li key={t.id} className="flex flex-col gap-1.5">
                          {t.sinGrabarAntes && t.anterior === c.tramos[j - 1]?.id ? (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground before:h-px before:flex-1 before:border-t-2 before:border-dashed after:h-px after:flex-1 after:border-t-2 after:border-dashed">
                              {t.sinGrabarAntes} sin GPS
                            </p>
                          ) : null}
                          <Bloque tramo={t} elegido={elegido === t.id} onClick={() => escoger(t.id)} />
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}

function Bloque({ tramo: t, elegido, onClick }: { tramo: Tramo; elegido: boolean; onClick: () => void }) {
  const color = t.sentido ? COLOR_SENTIDO[t.sentido] : COLOR_FUERA_DE_VIAJE
  return (
    <button
      type="button"
      data-tramo={t.id}
      aria-pressed={elegido}
      onClick={onClick}
      className={cn(
        "flex w-full items-stretch gap-3 rounded-xl border-2 bg-background p-3 text-left outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring",
        elegido && "border-primary bg-accent"
      )}
    >
      <span aria-hidden className={cn("w-1.5 shrink-0 rounded-full", !t.sentido && "opacity-60")} style={{ backgroundColor: color }} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-bold">{t.sentido ? SENTIDOS[t.sentido].corto : "Fuera de un viaje"}</span>
          <span className="text-sm font-bold tabular-nums">{t.horas}</span>
        </span>
        <span className="text-sm text-muted-foreground">
          {t.duracion} · {t.n} {t.n === 1 ? "punto" : "puntos"} · {t.km}
        </span>
      </span>
    </button>
  )
}
