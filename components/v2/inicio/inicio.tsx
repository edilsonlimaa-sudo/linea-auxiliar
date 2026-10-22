"use client"

import {
  ArrowRightIcon,
  BusIcon,
  ChevronRightIcon,
  ClockIcon,
  HandIcon,
  MapIcon,
  MapPinIcon,
  MegaphoneIcon,
  SnowflakeIcon,
  StarIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react"
import { useState } from "react"

import { ESCENARIOS, type CarroDemo, type ChoferDemo, type EscenarioDemo, type Sentido } from "@/components/v2/inicio/demo"
import { Alert, AlertDescription, AlertTitle } from "@/components/v2/ui/alert"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/v2/ui/avatar"
import { Badge } from "@/components/v2/ui/badge"
import { Button } from "@/components/v2/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/v2/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/v2/ui/empty"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/v2/ui/item"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/v2/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/v2/ui/tabs"
import { cn } from "@/lib/utils"

const DONDE: Record<Sentido, { corto: string; recoge: string }> = {
  centro: { corto: "Al Centro", recoge: "en Valle Grande" },
  valle: { corto: "A Valle Grande", recoge: "en Gina" },
}
const ESTADO: Record<CarroDemo["estado"], string> = {
  recogiendo: "Recogiendo ahora",
  llegando: "Llegando",
  en_camino: "En camino",
  proximo: "Próximo viaje",
  en_ruta: "En ruta",
}
const iniciales = (n: string) => n.split(" ").map((p) => p[0]).join("").slice(0, 2)
const cuando = (c: CarroDemo) => (c.minutos === 0 ? "Ahora" : `${c.minutos} min`)
// De mañana se va al Centro; de tarde, a Valle Grande (como en la v1)
const sugerido = (): Sentido => (new Date().getHours() < 12 ? "centro" : "valle")

/**
 * Propuesta de Inicio del pasajero (v2). Una sola pregunta guía la pantalla: "¿puedo irme ya, en cuánto y qué hago?".
 * Arriba lo que está en curso (su viaje); después el sentido, la próxima salida con UNA acción y, a pedido, el resto.
 * Sin base: los escenarios de components/v2/inicio/demo.ts.
 */
export function InicioV2({ nombre }: { nombre: string }) {
  const [escenarioId, setEscenarioId] = useState(ESCENARIOS[0].id)
  const [sentido, setSentido] = useState<Sentido>(sugerido)
  const [chofer, setChofer] = useState<ChoferDemo | null>(null)
  const [accion, setAccion] = useState<string | null>(null)
  const e = ESCENARIOS.find((x) => x.id === escenarioId) ?? ESCENARIOS[0]

  const conPuesto = e.alCentro.filter((c) => c.libres > 0)
  const cuenta: Record<Sentido, string> = {
    centro: conPuesto.length === 0 ? "Sin carros" : conPuesto.length === 1 ? "1 carro" : `${conPuesto.length} carros`,
    valle: e.aValle.carros.length === 0 ? "Sin carros" : `${e.aValle.esperando} en la lista`,
  }

  return (
    <div className="flex flex-col gap-6">
      <Escenarios activo={escenarioId} onCambiar={setEscenarioId} />

      {/* 1. Saludo y la línea en una línea: ¿hay servicio? */}
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Hola, {nombre}</p>
          <h1 className="text-2xl font-semibold tracking-tight">¿A dónde vas?</h1>
        </div>
        <LineaAhora escenario={e} />
      </header>

      {e.aviso && (
        <Alert>
          <MegaphoneIcon />
          <AlertTitle>Aviso de hoy</AlertTitle>
          <AlertDescription>{e.aviso}</AlertDescription>
        </Alert>
      )}

      {/* 2. Lo que está en curso va primero: retomar es más importante que empezar */}
      {e.miViaje && (
        <Card className="ring-2 ring-primary">
          <CardHeader className="flex flex-row items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <TicketIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tu viaje</p>
              <p className="font-semibold">{e.miViaje.titulo}</p>
              <p className="text-sm text-muted-foreground">
                {e.miViaje.chofer.nombre} recoge en {e.miViaje.minutos} min · {e.miViaje.detalle}
              </p>
            </div>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" size="lg" onClick={() => setAccion("Ver mi viaje")}>
              Ver mi viaje
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* 3. El sentido: sugerido por la hora, cambiarlo es un toque */}
      <Tabs value={sentido} onValueChange={(v) => setSentido(v as Sentido)}>
        <TabsList className="w-full p-1 group-data-horizontal/tabs:h-auto">
          {(["centro", "valle"] as Sentido[]).map((s) => (
            <TabsTrigger key={s} value={s} className="h-auto flex-col gap-0 py-2">
              <span className="font-semibold">{DONDE[s].corto}</span>
              <span className="text-xs font-normal text-muted-foreground">{cuenta[s]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* 4. La próxima salida con una sola acción; el resto a pedido */}
      {sentido === "centro" ? (
        <AlCentro escenario={e} onChofer={setChofer} onAccion={setAccion} onOtroSentido={() => setSentido("valle")} />
      ) : (
        <AValle escenario={e} onChofer={setChofer} onAccion={setAccion} />
      )}

      <PerfilChofer chofer={chofer} onCerrar={() => setChofer(null)} />
      <SiguientePaso accion={accion} onCerrar={() => setAccion(null)} />
    </div>
  )
}

/** Solo para mirar la propuesta: cambia el estado de la línea */
function Escenarios({ activo, onCambiar }: { activo: string; onCambiar: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
      <p className="text-xs font-medium text-muted-foreground">Propuesta · datos de ejemplo. Escenario:</p>
      <div className="flex flex-wrap gap-1.5">
        {ESCENARIOS.map((s) => (
          <Button key={s.id} size="sm" variant={s.id === activo ? "default" : "outline"} onClick={() => onCambiar(s.id)}>
            {s.titulo}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** ¿Hay servicio? Caras de quienes trabajan, o quién vuelve y cuándo */
function LineaAhora({ escenario: e }: { escenario: EscenarioDemo }) {
  const [abierta, setAbierta] = useState(false)
  const hay = e.trabajando.length > 0
  return (
    <>
      <Item variant="muted" render={<button type="button" onClick={() => setAbierta(true)} />} className="text-left">
        <ItemMedia>
          {hay ? (
            <AvatarGroup>
              {e.trabajando.slice(0, 3).map((c) => (
                <Avatar key={c.placa} size="sm">
                  <AvatarFallback className="text-xs">{c.nombre[0]}</AvatarFallback>
                </Avatar>
              ))}
              {e.trabajando.length > 3 && <AvatarGroupCount>+{e.trabajando.length - 3}</AvatarGroupCount>}
            </AvatarGroup>
          ) : (
            <span className="size-2 rounded-full bg-muted-foreground" />
          )}
        </ItemMedia>
        <ItemContent>
          <ItemTitle>
            {hay ? (
              <>
                <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
                {e.trabajando.length === 1 ? "1 chofer trabajando" : `${e.trabajando.length} choferes trabajando`}
              </>
            ) : (
              "Nadie trabajando ahora"
            )}
          </ItemTitle>
          <ItemDescription>
            {hay ? "Mira dónde va cada carro" : e.vuelven[0] ? `${e.vuelven[0].nombre} ${e.vuelven[0].texto}` : "Vuelve a mirar más tarde"}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <MapIcon className="size-4 text-muted-foreground" />
        </ItemActions>
      </Item>

      <Sheet open={abierta} onOpenChange={setAbierta}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>La línea ahora</SheetTitle>
            <SheetDescription>Aquí iría el mapa en vivo con cada carro y lo que hace.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-6">
            <MapaFalso />
            <ItemGroup>
              {e.trabajando.map((c) => (
                <Item key={c.placa} size="sm">
                  <ItemMedia>
                    <Avatar size="sm">
                      <AvatarFallback>{iniciales(c.nombre)}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{c.nombre}</ItemTitle>
                    <ItemDescription>Unidad {c.unidad} · {c.placa}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
              {e.vuelven.map((v) => (
                <Item key={v.nombre} size="sm">
                  <ItemContent>
                    <ItemTitle className="text-muted-foreground">{v.nombre}</ItemTitle>
                    <ItemDescription>{v.texto}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

/** Valle Grande → Centro: se aparta puesto. La primera con puesto, en grande; las demás, en una lista corta */
function AlCentro({
  escenario: e,
  onChofer,
  onAccion,
  onOtroSentido,
}: {
  escenario: EscenarioDemo
  onChofer: (c: ChoferDemo) => void
  onAccion: (a: string) => void
  onOtroSentido: () => void
}) {
  const primero = e.alCentro.find((c) => c.libres > 0)
  const resto = e.alCentro.filter((c) => c !== primero)

  if (!primero) {
    return (
      <SinCarros
        titulo={e.alCentro.length ? "Todos van llenos por ahora" : "Ningún carro hacia el Centro ahora"}
        vuelven={e.vuelven}
        otro={e.aValle.carros.length > 0 ? { texto: "Ver los carros a Valle Grande", onIr: onOtroSentido } : null}
      />
    )
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Carros al Centro">
      <Card>
        <CardHeader className="gap-1">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">Recoge primero</Badge>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", primero.minutos <= 3 ? "bg-emerald-500" : "bg-amber-500")} />
              {ESTADO[primero.estado]}
            </span>
          </div>
          <p className="pt-2 text-sm text-muted-foreground">Recoge {DONDE.centro.recoge} en</p>
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight tabular-nums">{cuando(primero)}</span>
            {primero.minutos > 0 && <span className="text-muted-foreground">· {primero.hora}</span>}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Puestos puestos={primero.puestos} libres={primero.libres} />
          <FilaChofer chofer={primero.chofer} onAbrir={() => onChofer(primero.chofer)} />
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button size="lg" className="w-full" onClick={() => onAccion("Apartar puesto")}>
            Apartar puesto
          </Button>
          <p className="text-center text-xs text-muted-foreground">Te preguntamos dónde estás y cuántos van.</p>
        </CardFooter>
      </Card>

      {resto.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Después</h2>
          <ItemGroup className="gap-2">
            {resto.map((c) => (
              <OtraSalida key={c.id} carro={c} onAbrir={() => onChofer(c.chofer)} onApartar={() => onAccion("Apartar puesto")} />
            ))}
          </ItemGroup>
        </div>
      )}
    </section>
  )
}

/** Centro → Valle Grande: no se aparta; se anota en la lista de Gina. Lo que importa: cuántos hay y cuándo pasa el carro */
function AValle({
  escenario: e,
  onChofer,
  onAccion,
}: {
  escenario: EscenarioDemo
  onChofer: (c: ChoferDemo) => void
  onAccion: (a: string) => void
}) {
  const { esperando, enGina, enCamino, carros } = e.aValle
  const proximo = carros[0]
  return (
    <section className="flex flex-col gap-4" aria-label="Lista a Valle Grande">
      <Card>
        <CardHeader className="gap-1">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">Lista en Gina</Badge>
            <span className="text-xs text-muted-foreground">Por orden de llegada</span>
          </div>
          <p className="pt-2 text-sm text-muted-foreground">Si te anotas ahora, serías el</p>
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-tight tabular-nums">{esperando + 1}</span>
            <span className="text-muted-foreground">
              · {enGina} en Gina{enCamino > 0 && `, ${enCamino} en el camino`}
            </span>
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {proximo ? (
            <>
              <p className="flex items-center gap-2 text-sm">
                <ClockIcon className="size-4 text-muted-foreground" />
                <span>
                  Próximo carro en Gina en <strong>{cuando(proximo)}</strong> · {proximo.libres} puestos
                </span>
              </p>
              <FilaChofer chofer={proximo.chofer} onAbrir={() => onChofer(proximo.chofer)} />
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClockIcon className="size-4" />
              Ningún carro viene a Gina ahora. Te avisamos en la lista cuando salga uno.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button size="lg" className="w-full" onClick={() => onAccion("Anotarme en la lista")}>
            <HandIcon data-icon="inline-start" />
            Anotarme en la lista
          </Button>
          <p className="text-center text-xs text-muted-foreground">Anótate cuando ya estés esperando: quien llega primero, sube primero.</p>
        </CardFooter>
      </Card>

      {carros.length > 1 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Después</h2>
          <ItemGroup className="gap-2">
            {carros.slice(1).map((c) => (
              <OtraSalida key={c.id} carro={c} onAbrir={() => onChofer(c.chofer)} />
            ))}
          </ItemGroup>
        </div>
      )}
    </section>
  )
}

/** Una salida más, en una línea: cuándo, quién, cuántos puestos */
function OtraSalida({ carro: c, onAbrir, onApartar }: { carro: CarroDemo; onAbrir: () => void; onApartar?: () => void }) {
  const lleno = c.libres === 0
  return (
    <Item variant="outline">
      <ItemMedia className="w-16 flex-col items-start gap-0 whitespace-nowrap">
        <span className="text-lg font-semibold tabular-nums">{cuando(c)}</span>
        <span className="text-xs text-muted-foreground">{c.hora}</span>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <button type="button" onClick={onAbrir} className="text-left underline-offset-4 hover:underline">
            {c.chofer.nombre}
          </button>
        </ItemTitle>
        <ItemDescription>
          {ESTADO[c.estado]} · {lleno ? "Lleno" : c.libres === 1 ? "1 libre" : `${c.libres} libres`}
        </ItemDescription>
      </ItemContent>
      {onApartar && !lleno && (
        <ItemActions>
          <Button variant="outline" size="sm" onClick={onApartar}>
            Apartar
          </Button>
        </ItemActions>
      )}
    </Item>
  )
}

/** Quién maneja, una vez, tocable: foto, nombre, ★, placa */
function FilaChofer({ chofer: c, onAbrir }: { chofer: ChoferDemo; onAbrir: () => void }) {
  return (
    <Item variant="muted" size="sm" render={<button type="button" onClick={onAbrir} />} className="text-left">
      <ItemMedia>
        <Avatar>
          <AvatarFallback>{iniciales(c.nombre)}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {c.nombre}
          <span className="inline-flex items-center gap-0.5 font-normal text-muted-foreground">
            <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
            {c.estrellas.toFixed(1).replace(".", ",")}
          </span>
        </ItemTitle>
        <ItemDescription>
          <span className="font-mono font-medium text-foreground">{c.placa}</span> · Unidad {c.unidad}
          {c.aire && " · Aire"}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <ChevronRightIcon className="size-4 text-muted-foreground" />
      </ItemActions>
    </Item>
  )
}

/** Puestos de un vistazo */
function Puestos({ puestos, libres }: { puestos: number; libres: number }) {
  const ocupados = puestos - libres
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: puestos }, (_, i) => (
          <span key={i} className={cn("h-2 w-6 rounded-full", i < ocupados ? "bg-muted-foreground/30" : "bg-emerald-500")} />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {libres === 1 ? "1 puesto libre" : `${libres} puestos libres`} de {puestos}
      </span>
    </div>
  )
}

function SinCarros({
  titulo,
  vuelven,
  otro,
}: {
  titulo: string
  vuelven: EscenarioDemo["vuelven"]
  otro: { texto: string; onIr: () => void } | null
}) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BusIcon />
        </EmptyMedia>
        <EmptyTitle>{titulo}</EmptyTitle>
        <EmptyDescription>
          {vuelven.length > 0 ? vuelven.map((v) => `${v.nombre} ${v.texto}`).join(" · ") : "Esta pantalla se actualiza sola."}
        </EmptyDescription>
      </EmptyHeader>
      {otro && (
        <EmptyContent>
          <Button variant="outline" onClick={otro.onIr}>
            {otro.texto}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}

function PerfilChofer({ chofer: c, onCerrar }: { chofer: ChoferDemo | null; onCerrar: () => void }) {
  return (
    <Sheet open={c !== null} onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent side="bottom">
        {c && (
          <>
            <SheetHeader className="flex-row items-center gap-3">
              <Avatar size="lg">
                <AvatarFallback>{iniciales(c.nombre)}</AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle>{c.completo}</SheetTitle>
                <SheetDescription className="flex items-center gap-1">
                  <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
                  {c.estrellas.toFixed(1).replace(".", ",")} · {c.calificaciones} calificaciones
                </SheetDescription>
              </div>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-4 pb-6">
              <div className="grid aspect-video place-items-center rounded-lg bg-muted text-sm text-muted-foreground">Foto del carro</div>
              <ItemGroup>
                <Item size="sm">
                  <ItemContent>
                    <ItemDescription>Placa</ItemDescription>
                    <ItemTitle className="font-mono">{c.placa}</ItemTitle>
                  </ItemContent>
                  <ItemContent>
                    <ItemDescription>Unidad</ItemDescription>
                    <ItemTitle>{c.unidad}</ItemTitle>
                  </ItemContent>
                </Item>
                <Item size="sm">
                  <ItemContent>
                    <ItemDescription>Carro</ItemDescription>
                    <ItemTitle>
                      {c.carro}
                      {c.aire && (
                        <Badge variant="secondary">
                          <SnowflakeIcon />
                          Aire
                        </Badge>
                      )}
                    </ItemTitle>
                  </ItemContent>
                </Item>
              </ItemGroup>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** En la propuesta, las acciones solo dicen qué vendría después */
function SiguientePaso({ accion, onCerrar }: { accion: string | null; onCerrar: () => void }) {
  return (
    <Sheet open={accion !== null} onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>{accion}</SheetTitle>
          <SheetDescription>Siguiente paso de la propuesta: esta acción se diseña en su propia pantalla.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4 pb-6 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <MapPinIcon className="size-4" /> ¿Dónde estás?
          </p>
          <p className="flex items-center gap-2">
            <UsersIcon className="size-4" /> ¿Cuántos van?
          </p>
          <Button className="mt-2" variant="outline" onClick={onCerrar}>
            Cerrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Un mapa de mentira para la propuesta: la ruta y los carros */
function MapaFalso() {
  return (
    <svg viewBox="0 0 320 140" className="w-full rounded-lg bg-muted" role="img" aria-label="Mapa de ejemplo de la línea">
      <path d="M20 110 C 90 100, 120 40, 190 50 S 280 30, 300 25" fill="none" className="stroke-muted-foreground/40" strokeWidth="6" strokeLinecap="round" />
      <circle cx="20" cy="110" r="6" className="fill-foreground" />
      <text x="30" y="128" className="fill-muted-foreground text-[10px]">Valle Grande</text>
      <circle cx="300" cy="25" r="6" className="fill-foreground" />
      <text x="248" y="16" className="fill-muted-foreground text-[10px]">Centro</text>
      <circle cx="120" cy="72" r="7" className="fill-emerald-500" />
      <circle cx="220" cy="42" r="7" className="fill-emerald-500" />
    </svg>
  )
}
