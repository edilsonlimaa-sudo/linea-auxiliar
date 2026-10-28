"use client"

import { MapIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { MapaRutas } from "@/components/admin/mapa-rutas"
import { Button } from "@/components/ui/button"
import type { Tramo } from "@/lib/datos/rutas"
import { COLOR_FUERA_DE_VIAJE, COLOR_SENTIDO } from "@/lib/mapa"
import { cn } from "@/lib/utils"
import { SENTIDOS } from "@/lib/viajes"

type Dia = { dia: string; texto: string; choferes: { id: string; nombre: string; tramos: Tramo[] }[] }

// Los tramos seguidos del mismo viaje, juntos (el marco de la lista); los de sin viaje, cada uno suelto
function porViaje(tramos: Tramo[]) {
  const grupos: { ciclo: Tramo["ciclo"]; tramos: Tramo[] }[] = []
  for (const t of tramos) {
    const ultimo = grupos.at(-1)
    if (t.ciclo && ultimo?.ciclo?.id === t.ciclo.id) ultimo.tramos.push(t)
    else grupos.push({ ciclo: t.ciclo, tramos: [t] })
  }
  return grupos
}

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

// Lo escogido: un bloque solo, o una combinación de viajes enteros y bloques de fuera de un viaje (para comparar)
type Vista = { tramo: string } | { viajes: string[]; varios: string[] } | null
type Eleccion = { tramo: string } | { ids: string[] } | null

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/**
 * Rutas (R92): el mapa y, debajo, los mismos tramos como bloques en orden, para leer la cronología. Tocar un bloque deja
 * en el mapa solo ese; "Ver en el mapa" (viajes) y las casillas (bloques de fuera de un viaje) se suman: el mapa muestra
 * todo lo marcado junto. Tocar una línea en el mapa escoge su bloque sin esconder nada.
 */
export function RutasVista({ tramos }: { tramos: Tramo[] }) {
  const dias = useMemo(() => porDia(tramos), [tramos])
  const lista = useRef<HTMLDivElement>(null)
  // Lo que se ve en el mapa (hasta "Ver todo") y lo resaltado dentro de eso (cambia también al tocar el mapa)
  const [vista, setVista] = useState<Vista>(null)
  const [eleccion, setEleccion] = useState<Eleccion>(null)
  const viajes = vista && "viajes" in vista ? vista.viajes : []
  const marcados = vista && "varios" in vista ? vista.varios : []
  const idsDe = useCallback(
    (v: Vista) =>
      !v ? [] : "tramo" in v ? [v.tramo] : tramos.filter((t) => (t.ciclo && v.viajes.includes(t.ciclo.id)) || v.varios.includes(t.id)).map((t) => t.id),
    [tramos]
  )
  const enMapa = useMemo(() => {
    if (!vista) return tramos
    const ids = new Set(idsDe(vista))
    return tramos.filter((t) => ids.has(t.id))
  }, [vista, tramos, idsDe])
  const elegidos = useMemo(() => (!eleccion ? [] : "tramo" in eleccion ? [eleccion.tramo] : eleccion.ids), [eleccion])
  const tramoElegido = eleccion && "tramo" in eleccion ? eleccion.tramo : null

  const avisoVista = useMemo(() => {
    if (!vista) return null
    if ("tramo" in vista) {
      const t = tramos.find((x) => x.id === vista.tramo)
      if (!t) return null
      const tipo = t.sentido ? SENTIDOS[t.sentido].corto : t.ciclo ? "Recogiendo" : "Fuera de un viaje"
      return { verbo: "Solo se ve", que: `un bloque de ${t.chofer} (${tipo.replace(/^./, (c) => c.toLowerCase())}) · ${t.horas}` }
    }
    const partes: string[] = []
    if (vista.viajes.length === 1) {
      const c = tramos.find((t) => t.ciclo?.id === vista.viajes[0])?.ciclo
      if (c) partes.push(`el ${c.titulo.replace(/^V/, "v")} (${c.horas})`)
    } else if (vista.viajes.length > 1) partes.push(plural(vista.viajes.length, "viaje", "viajes"))
    if (vista.varios.length) partes.push(plural(vista.varios.length, "bloque fuera de un viaje", "bloques fuera de un viaje"))
    const varios = vista.viajes.length + vista.varios.length > 1
    return { verbo: varios ? "Solo se ven" : "Solo se ve", que: partes.join(" y ") }
  }, [vista, tramos])

  // Escogido en el mapa: abre su día si estaba cerrado y lo muestra
  useEffect(() => {
    if (!tramoElegido) return
    const bloque = lista.current?.querySelector<HTMLElement>(`[data-tramo="${tramoElegido}"]`)
    const dia = bloque?.closest("details")
    if (dia && !dia.open) dia.open = true
    bloque?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [tramoElegido])

  const alMapa = () => document.getElementById("mapa-rutas")?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  // Cambia lo que se ve y lo resalta todo (si queda un solo bloque, con su popup)
  const ver = (v: Vista) => {
    const ids = idsDe(v)
    setVista(ids.length ? v : null)
    setEleccion(ids.length === 0 ? null : ids.length === 1 ? { tramo: ids[0] } : { ids })
  }
  const escoger = (id: string) => {
    ver(vista && "tramo" in vista && vista.tramo === id ? null : { tramo: id })
    alMapa()
  }
  const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])
  const escogerViaje = (id: string) => {
    ver({ viajes: alternar(viajes, id), varios: marcados })
    alMapa()
  }
  const marcar = (id: string) => ver({ viajes, varios: alternar(marcados, id) })
  const verTodo = () => ver(null)
  const delMapa = useCallback((id: string | null) => setEleccion(id ? { tramo: id } : null), [])

  return (
    <>
      <div id="mapa-rutas" className="flex flex-col gap-2">
        {avisoVista ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-primary bg-accent px-4 py-2">
            <p className="text-sm">
              {avisoVista.verbo} <span className="font-bold">{avisoVista.que}</span>
            </p>
            <Button variant="outline" onClick={verTodo}>
              Ver todo
            </Button>
          </div>
        ) : null}
        <MapaRutas tramos={enMapa} elegidos={elegidos} onElegir={delMapa} />
      </div>
      <section aria-labelledby="titulo-cronologia" className="flex flex-col gap-3">
        <div>
          <h2 id="titulo-cronologia" className="text-base font-bold">
            En orden
          </h2>
          <p className="text-sm text-muted-foreground">
            Cada bloque es un tramo del mapa: puntos seguidos del mismo chofer, sin cortes del GPS. El marco punteado es un viaje,
            según lo que marcó el chofer: desde que empieza a recoger (Ya llegué) hasta que lo termina.
          </p>
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
                      {porViaje(c.tramos).map((g) => {
                        // El hueco sin GPS antes de un bloque (entre dos viajes, va fuera del marco)
                        const hueco = (t: Tramo) => {
                          const previo = c.tramos[c.tramos.indexOf(t) - 1]
                          return t.sinGrabarAntes && previo && t.anterior === previo.id ? <SinGps tiempo={t.sinGrabarAntes} /> : null
                        }
                        const filas = g.tramos.map((t, k) => (
                          <li key={t.id} className="flex flex-col gap-1.5">
                            {g.ciclo && k === 0 ? null : hueco(t)}
                            <Bloque
                              tramo={t}
                              elegido={elegidos.includes(t.id)}
                              onClick={() => escoger(t.id)}
                              marcar={t.ciclo ? undefined : { marcado: marcados.includes(t.id), onMarcar: () => marcar(t.id) }}
                            />
                          </li>
                        ))
                        if (!g.ciclo) return filas
                        // El marco del viaje: de que empieza a recoger hasta que termina (registros del viaje)
                        return (
                          <li key={g.ciclo.id + g.tramos[0].id} className="flex flex-col gap-1.5">
                            {hueco(g.tramos[0])}
                            <div
                              className={cn(
                                "rounded-2xl border-2 border-dashed border-muted-foreground/40 bg-muted/40 p-2",
                                viajes.includes(g.ciclo.id) && "border-primary bg-accent/60"
                              )}
                            >
                              <MarcoViaje ciclo={g.ciclo} elegido={viajes.includes(g.ciclo.id)} onClick={() => escogerViaje(g.ciclo!.id)} />
                              <ol className="flex flex-col gap-1.5">{filas}</ol>
                            </div>
                          </li>
                        )
                      })}
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

// El encabezado del marco: tocarlo muestra en el mapa todos los bloques del viaje juntos (o los suelta)
function MarcoViaje({ ciclo, elegido, onClick }: { ciclo: NonNullable<Tramo["ciclo"]>; elegido: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={elegido}
      onClick={onClick}
      className="mb-1.5 flex min-h-11 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl px-2 py-1 text-left text-sm outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      <span className="flex items-center gap-2">
        <span className="font-bold">{ciclo.titulo}</span>
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-bold", elegido ? "border-primary bg-primary text-primary-foreground" : "bg-card text-primary")}>
          <MapIcon aria-hidden className="size-3.5" />
          {elegido ? "En el mapa" : "Ver en el mapa"}
        </span>
      </span>
      <span className="text-muted-foreground">
        {ciclo.horas} · {ciclo.nota}
      </span>
    </button>
  )
}

function SinGps({ tiempo }: { tiempo: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground before:h-px before:flex-1 before:border-t-2 before:border-dashed after:h-px after:flex-1 after:border-t-2 after:border-dashed">
      {tiempo} sin GPS
    </p>
  )
}

// Los de fuera de un viaje traen una casilla para juntar varios en el mapa
function Bloque({
  tramo: t,
  elegido,
  onClick,
  marcar,
}: {
  tramo: Tramo
  elegido: boolean
  onClick: () => void
  marcar?: { marcado: boolean; onMarcar: () => void }
}) {
  const boton = <BotonBloque tramo={t} elegido={elegido} onClick={onClick} />
  if (!marcar) return boton
  return (
    <div className="flex items-stretch gap-1.5">
      <label className="flex w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 bg-background hover:bg-muted has-focus-visible:ring-[3px] has-focus-visible:ring-ring">
        <input
          type="checkbox"
          checked={marcar.marcado}
          onChange={marcar.onMarcar}
          aria-label={`Juntar en el mapa el bloque de ${t.horas}`}
          className="size-5 accent-primary outline-none"
        />
      </label>
      {boton}
    </div>
  )
}

function BotonBloque({ tramo: t, elegido, onClick }: { tramo: Tramo; elegido: boolean; onClick: () => void }) {
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
          <span className="font-bold">{t.sentido ? SENTIDOS[t.sentido].corto : t.ciclo ? "Recogiendo" : "Fuera de un viaje"}</span>
          <span className="text-sm font-bold tabular-nums">{t.horas}</span>
        </span>
        <span className="text-sm text-muted-foreground">
          {t.duracion} · {t.n} {t.n === 1 ? "punto" : "puntos"} · {t.km}
        </span>
      </span>
    </button>
  )
}
