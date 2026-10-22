"use client"

import { ArrowDownUpIcon, BellIcon, CheckIcon, MinusIcon, PlusIcon, StarIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { SIN_CARROS, TRAMOS, type CarroDemo, type Sentido, type TramoDemo } from "@/components/v2/linea/demo"
import { Avatar, AvatarFallback } from "@/components/v2/ui/avatar"
import { Badge } from "@/components/v2/ui/badge"
import { Button } from "@/components/v2/ui/button"
import { Card } from "@/components/v2/ui/card"
import { Input } from "@/components/v2/ui/input"
import { Label } from "@/components/v2/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/v2/ui/sheet"
import { cn } from "@/lib/utils"

// Lo que pasa con el pasajero, en la misma pantalla: mira la línea → "Me voy" → espera su carro → a bordo → llegó
type Etapa = "libre" | "esperando" | "llego" | "abordo" | "llegaste"

const sugerido = (): Sentido => (new Date().getHours() < 12 ? "centro" : "valle")
const libresTexto = (n: number) => (n === 0 ? "lleno" : n === 1 ? "1 libre" : `${n} libres`)

/**
 * Propuesta "La línea + Me voy" (v2). La home es el corredor dibujado (Valle Grande · Gina · Centro) con los carros
 * andando sobre él y "Tú"; abajo, una sola acción: "Me voy". El sistema escoge el carro (o te anota en la lista de
 * Gina): el pasajero no tiene que saber las dos reglas. Al irse, la misma pantalla sigue su carro hasta que llega.
 * Escoger un carro a mano queda a un toque, tocándolo en la línea. Datos de ejemplo: components/v2/linea/demo.ts.
 */
export function InicioV2() {
  const [sentido, setSentido] = useState<Sentido>(sugerido)
  const [vacio, setVacio] = useState(false)
  const [etapa, setEtapa] = useState<Etapa>("libre")
  const [carros, setCarros] = useState<CarroDemo[]>(TRAMOS[sentido].carros)
  const [miCarroId, setMiCarroId] = useState<string | null>(null)
  const [miPos, setMiPos] = useState(TRAMOS[sentido].tu.pos)
  const [confirmar, setConfirmar] = useState(false)
  const [visto, setVisto] = useState<CarroDemo | null>(null)
  const [personas, setPersonas] = useState(1)

  const tramo = TRAMOS[sentido]
  const enLinea = vacio ? [] : carros
  const mejor = enLinea.find((c) => c.libres >= personas) ?? null
  const miCarro = enLinea.find((c) => c.id === miCarroId) ?? null

  // Simulación: el carro se acerca a ti; ya a bordo, avanzas hasta el destino
  useEffect(() => {
    if (etapa !== "esperando" && etapa !== "abordo") return
    const id = setInterval(() => {
      if (etapa === "esperando") {
        setCarros((cs) =>
          cs.map((c) => {
            if (c.id !== miCarroId) return c
            const minutos = Math.max(0, c.minutos - 1)
            const pos = minutos === 0 ? tramo.tu.pos : c.pos + (tramo.tu.pos - c.pos) / (c.minutos || 1)
            if (minutos === 0) setEtapa("llego")
            return { ...c, minutos, pos }
          })
        )
      } else {
        setMiPos((p) => {
          const siguiente = Math.min(tramo.llegada, p + 0.08)
          if (siguiente >= tramo.llegada) setEtapa("llegaste")
          return siguiente
        })
      }
    }, 1500)
    return () => clearInterval(id)
  }, [etapa, miCarroId, tramo])

  const reiniciar = (s: Sentido = sentido) => {
    setSentido(s)
    setEtapa("libre")
    setCarros(TRAMOS[s].carros)
    setMiCarroId(null)
    setMiPos(TRAMOS[s].tu.pos)
  }
  const irme = (carro: CarroDemo | null) => {
    setMiCarroId(carro?.id ?? null)
    setConfirmar(false)
    setVisto(null)
    setEtapa("esperando")
  }

  return (
    <div className="flex flex-col gap-3 pb-52">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Propuesta · datos de ejemplo</p>
          <h1 className="text-xl font-semibold tracking-tight">{tramo.destino === "Centro" ? "Al Centro" : "A Valle Grande"}</h1>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => setVacio((v) => !v)}>
            {vacio ? "Con carros" : "Sin carros"}
          </Button>
          <Button size="sm" variant="outline" disabled={etapa !== "libre"} onClick={() => reiniciar(sentido === "centro" ? "valle" : "centro")}>
            <ArrowDownUpIcon data-icon="inline-start" />
            Cambiar
          </Button>
        </div>
      </div>

      <Linea
        tramo={tramo}
        carros={etapa === "abordo" || etapa === "llegaste" ? [] : enLinea}
        miCarroId={miCarroId}
        miPos={miPos}
        aBordo={etapa === "abordo" || etapa === "llegaste"}
        onCarro={(c) => etapa === "libre" && setVisto(c)}
      />

      <Panel>
        {etapa === "libre" &&
          (enLinea.length === 0 ? (
            <>
              <p className="font-medium">Ningún carro en la línea ahora</p>
              <p className="text-sm text-muted-foreground">{SIN_CARROS.vuelve}</p>
              <Button size="lg" variant="outline" className="w-full">
                <BellIcon data-icon="inline-start" />
                Avísame cuando salga uno
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {tramo.modelo === "apartar" && mejor
                  ? `El próximo con puesto: ${mejor.chofer.nombre}, en ${mejor.minutos} min`
                  : tramo.modelo === "lista"
                    ? `${tramo.enLista} esperan en Gina · próximo carro en ${enLinea[0].minutos} min`
                    : "Todos van llenos por ahora"}
              </p>
              <Button size="lg" className="h-12 w-full text-base" disabled={tramo.modelo === "apartar" && !mejor} onClick={() => setConfirmar(true)}>
                Me voy {tramo.destino === "Centro" ? "al Centro" : "a Valle Grande"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">O toca un carro en la línea para escogerlo.</p>
            </>
          ))}

        {etapa === "esperando" && (
          <>
            {tramo.modelo === "apartar" && miCarro ? (
              <>
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">Vas con {miCarro.chofer.nombre}</p>
                  <p className="text-3xl font-semibold tabular-nums">{miCarro.minutos} min</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Te recoge en {tramo.tu.lugar} · {miCarro.chofer.placa} · {personas === 1 ? "1 puesto" : `${personas} puestos`}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">Estás en la lista de Gina</p>
                  <p className="text-3xl font-semibold tabular-nums">#{tramo.enLista + 1}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Próximo carro en {enLinea[0]?.minutos ?? "—"} min · sube por orden de llegada
                </p>
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => reiniciar()}>
                {tramo.modelo === "apartar" ? "Ya no voy" : "Me fui"}
              </Button>
              <Button variant="secondary" onClick={() => setEtapa("llego")}>
                Ya estoy aquí
              </Button>
            </div>
          </>
        )}

        {etapa === "llego" && (
          <>
            <p className="flex items-center gap-2 font-medium">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
              {miCarro ? `${miCarro.chofer.nombre} llegó` : "Tu carro llegó a Gina"}
            </p>
            <p className="text-sm text-muted-foreground">
              Busca la placa {miCarro?.chofer.placa ?? enLinea[0]?.chofer.placa}. El chofer te marca al subir.
            </p>
            <Button size="lg" className="h-12 w-full text-base" onClick={() => setEtapa("abordo")}>
              Ya me subí
            </Button>
          </>
        )}

        {(etapa === "abordo" || etapa === "llegaste") && (
          <>
            <p className="font-medium">{etapa === "abordo" ? `A bordo hacia ${tramo.destino}` : `Llegaste a ${tramo.destino}`}</p>
            <p className="text-sm text-muted-foreground">
              {etapa === "abordo" ? "Te avisamos al llegar. Puedes bajarte antes: avísale al chofer." : "¿Cómo te fue? Califica en un toque."}
            </p>
            {etapa === "llegaste" && (
              <div className="flex justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} className="size-8 text-amber-400" />
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => reiniciar()}>
              Volver a empezar la demo
            </Button>
          </>
        )}
      </Panel>

      {/* "Me voy": solo lo que el sistema no puede saber */}
      <Sheet open={confirmar} onOpenChange={setConfirmar}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Me voy {tramo.destino === "Centro" ? "al Centro" : "a Valle Grande"}</SheetTitle>
            <SheetDescription>
              {tramo.modelo === "apartar"
                ? mejor && `Te ponemos con ${mejor.chofer.nombre}, que llega en ${mejor.minutos} min.`
                : `Te anotamos en la lista de Gina: serías el ${tramo.enLista + 1}.`}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v2-lugar">{tramo.modelo === "apartar" ? "¿Dónde te recogemos?" : "¿Dónde estás?"}</Label>
              <Input id="v2-lugar" defaultValue={tramo.tu.lugar} />
            </div>
            <div className="flex items-center justify-between">
              <Label>¿Cuántos van?</Label>
              <div className="flex items-center gap-3">
                <Button size="icon" variant="outline" aria-label="Uno menos" disabled={personas === 1} onClick={() => setPersonas((n) => n - 1)}>
                  <MinusIcon />
                </Button>
                <span className="w-4 text-center font-semibold tabular-nums">{personas}</span>
                <Button size="icon" variant="outline" aria-label="Uno más" disabled={personas === 4} onClick={() => setPersonas((n) => n + 1)}>
                  <PlusIcon />
                </Button>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button size="lg" className="h-12 text-base" onClick={() => irme(tramo.modelo === "apartar" ? mejor : (enLinea[0] ?? null))}>
              <CheckIcon data-icon="inline-start" />
              Confirmar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Escoger a mano: tocando un carro en la línea */}
      <Sheet open={visto !== null} onOpenChange={(v) => !v && setVisto(null)}>
        <SheetContent side="bottom">
          {visto && (
            <>
              <SheetHeader className="flex-row items-center gap-3">
                <Avatar size="lg">
                  <AvatarFallback>{visto.chofer.nombre[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle>{visto.chofer.completo}</SheetTitle>
                  <SheetDescription className="flex items-center gap-1">
                    <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
                    {visto.chofer.estrellas.toFixed(1).replace(".", ",")} · {visto.chofer.placa} · {visto.chofer.carro}
                  </SheetDescription>
                </div>
              </SheetHeader>
              <div className="flex flex-wrap gap-2 px-4">
                <Badge variant="secondary">Llega en {visto.minutos} min</Badge>
                <Badge variant="secondary">{libresTexto(visto.libres)}</Badge>
                {visto.chofer.aire && <Badge variant="secondary">Aire</Badge>}
              </div>
              <SheetFooter>
                {tramo.modelo === "apartar" ? (
                  <Button size="lg" className="h-12 text-base" disabled={visto.libres < personas} onClick={() => irme(visto)}>
                    {visto.libres < personas ? "Va lleno" : `Irme con ${visto.chofer.nombre}`}
                  </Button>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">Hacia Valle Grande se sube por orden de la lista de Gina.</p>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

/**
 * El corredor dibujado: paradas a la izquierda, la vía en el medio y, a la derecha, cada carro con cuánto le falta
 * para llegar a ti y sus puestos. "Tú" marca dónde esperas (o, a bordo, por dónde vas).
 */
function Linea({
  tramo,
  carros,
  miCarroId,
  miPos,
  aBordo,
  onCarro,
}: {
  tramo: TramoDemo
  carros: CarroDemo[]
  miCarroId: string | null
  miPos: number
  aBordo: boolean
  onCarro: (c: CarroDemo) => void
}) {
  const pct = (p: number) => `${p * 100}%`
  return (
    <div className="relative h-[calc(100svh-24.5rem)] min-h-72 rounded-xl border bg-muted/30" role="img" aria-label={`La línea hacia ${tramo.destino}`}>
      {/* La vía */}
      <div className="absolute inset-y-6 left-28 w-1 -translate-x-1/2 rounded-full bg-border" />
      {/* Ya a bordo: el tramo recorrido */}
      {aBordo && (
        <div
          className="absolute left-28 w-1 -translate-x-1/2 rounded-full bg-primary transition-all duration-1000"
          style={{ top: `calc(${pct(tramo.tu.pos)})`, height: `calc(${pct(miPos - tramo.tu.pos)})` }}
        />
      )}

      {tramo.paradas.map((p) => (
        <div key={p.nombre} className="absolute left-0 flex w-28 -translate-y-1/2 items-center justify-end gap-2 pr-6" style={{ top: pct(p.pos) }}>
          <span className="text-right text-xs leading-tight font-medium text-muted-foreground">{p.nombre}</span>
          <span className="absolute -right-1.5 size-3 rounded-full border-2 border-background bg-muted-foreground" />
        </div>
      ))}

      {/* Tú */}
      <div className="absolute left-28 flex -translate-x-1/2 -translate-y-1/2 items-center transition-all duration-1000" style={{ top: pct(miPos) }}>
        <span className="relative grid size-7 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-4 ring-primary/20">
          Tú
        </span>
      </div>

      {carros.map((c) => {
        const mio = c.id === miCarroId
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onCarro(c)}
            className="absolute left-28 flex -translate-y-1/2 items-center outline-none transition-all duration-1000"
            style={{ top: pct(c.pos) }}
            aria-label={`${c.chofer.nombre}: llega en ${c.minutos} minutos, ${libresTexto(c.libres)}`}
          >
            <span className={cn("-ml-2.5 size-5 rounded-full border-4 border-background", c.libres === 0 ? "bg-muted-foreground" : "bg-emerald-500")} />
            <span className="ml-1 h-px w-3 bg-border" />
            <Card
              size="sm"
              className={cn(
                "flex-row items-center gap-2 px-2.5 py-1.5 text-left text-xs shadow-sm",
                mio && "ring-2 ring-primary",
                c.libres === 0 && !mio && "opacity-60"
              )}
            >
              <span className="font-medium">{c.chofer.nombre}</span>
              <span className="tabular-nums">{c.minutos === 0 ? "aquí" : `${c.minutos} min`}</span>
              <span className="text-muted-foreground">{libresTexto(c.libres)}</span>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

/** La acción, siempre a la vista: pegada abajo, encima de la navegación */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 px-4 pb-3">
      <Card className="mx-auto flex max-w-lg flex-col gap-3 p-4 shadow-lg">{children}</Card>
    </div>
  )
}
