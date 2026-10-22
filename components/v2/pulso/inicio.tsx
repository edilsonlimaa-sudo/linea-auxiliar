"use client"

import { ArrowDownIcon, ArrowLeftRightIcon, ArrowUpIcon, BellIcon, CheckIcon, MinusIcon, PlusIcon, UsersIcon } from "lucide-react"
import { useState } from "react"

import { ESCENARIOS, type EscenarioDemo, type Sentido, type TrabajoDemo } from "@/components/v2/pulso/demo"
import { Badge } from "@/components/v2/ui/badge"
import { Button } from "@/components/v2/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/v2/ui/card"
import { Input } from "@/components/v2/ui/input"
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/v2/ui/item"
import { Label } from "@/components/v2/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/v2/ui/sheet"
import { cn } from "@/lib/utils"

// Desde dónde sale y hacia dónde va cada sentido. Hacia el Centro se llega hasta Gina (la parada final)
const SENTIDO: Record<Sentido, { desde: string; hacia: string; final: string; otro: Sentido }> = {
  centro: { desde: "Valle Grande", hacia: "el Centro", final: "Gina", otro: "valle" },
  valle: { desde: "el Centro", hacia: "Valle Grande", final: "Valle Grande", otro: "centro" },
}
const sugerido = (): Sentido => (new Date().getHours() < 12 ? "centro" : "valle")
const puestos = (n: number) => (n === 0 ? "lleno" : n === 1 ? "1 puesto" : `${n} puestos`)

type Salida = { quien: TrabajoDemo; cuando: string; nota: string; libres: number }
type Anotado = { conQuien: string | null; cuando: string; lugar: string; bajada: string; personas: number }

/**
 * Propuesta "¿Hay carro hacia…?" (v2). El pasajero tiene un sentido, no un destino (se baja donde quiera en el
 * camino), y hay más gente que puestos. Por eso la home responde primero: ¿hay carro hacia mi lado ahora? ¿y si no,
 * cuándo? Usa la ida y vuelta de cada chofer (quien va hacia el otro lado vuelve después hacia el mío) y lo que publicó.
 * Datos de ejemplo: components/v2/pulso/demo.ts.
 */
export function InicioV2() {
  const [escenarioId, setEscenarioId] = useState(ESCENARIOS[0].id)
  const [sentido, setSentido] = useState<Sentido>(sugerido)
  const [hoja, setHoja] = useState(false)
  const [anotado, setAnotado] = useState<Anotado | null>(null)
  const e = ESCENARIOS.find((x) => x.id === escenarioId) ?? ESCENARIOS[0]
  const s = SENTIDO[sentido]

  // Ahora: quien hace mi sentido, todavía no salió y tiene puesto. Pronto: quien después vuelve hacia mi lado
  const ahora = e.trabajando
    .filter((t) => t.ahora.sentido === sentido && t.ahora.estado !== "en_ruta" && t.ahora.libres > 0)
    .sort((a, b) => a.ahora.minutos - b.ahora.minutos)
  const pronto = e.trabajando.filter((t) => t.despues?.sentido === sentido && !ahora.includes(t))
  const salidas: Salida[] = [
    ...ahora.map((t) => ({
      quien: t,
      cuando: t.ahora.minutos === 0 ? "Ahora" : `~${t.ahora.minutos} min`,
      nota: t.ahora.minutos === 0 ? `Recogiendo en ${s.desde}` : `Va a recoger en ${s.desde}`,
      libres: t.ahora.libres,
    })),
    ...pronto.map((t) => ({
      quien: t,
      cuando: t.despues!.hora,
      nota: t.despues!.publicado ? "Viaje publicado" : `Estimado: al volver de ${SENTIDO[t.ahora.sentido].final}`,
      libres: t.ahora.puestos,
    })),
  ]
  const enCamino = salidas.reduce((n, x) => n + x.libres, 0)
  const estado: "ahora" | "pronto" | "nadie" = ahora.length ? "ahora" : pronto.length ? "pronto" : "nadie"

  const cambiar = () => {
    setSentido(s.otro)
    setAnotado(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <Escenarios activo={escenarioId} onCambiar={(id) => (setEscenarioId(id), setAnotado(null))} />

      {/* 1. Dónde estás y hacia dónde: un sentido, no un destino */}
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Estás en {s.desde}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Hacia {s.hacia}</h1>
          <p className="text-xs text-muted-foreground">Te bajas donde quieras en el camino.</p>
        </div>
        <Button variant="outline" size="sm" onClick={cambiar}>
          <ArrowLeftRightIcon data-icon="inline-start" />
          Cambiar
        </Button>
      </header>

      {/* 2. La respuesta: ¿hay carro hacia mi lado? */}
      {anotado ? (
        <MiAnotacion anotado={anotado} s={s} onSalir={() => setAnotado(null)} />
      ) : (
        <Respuesta estado={estado} s={s} ahora={ahora} pronto={pronto} escenario={e} onQuiero={() => setHoja(true)} />
      )}

      {/* 3. Oferta y demanda, con honestidad: hay más gente que puestos */}
      <Demanda esperan={e.esperan[sentido]} puestos={enCamino} hacia={s.hacia} />

      {/* 4. Lo que viene hacia mi lado, en orden */}
      {salidas.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="titulo-salidas">
          <h2 id="titulo-salidas" className="text-sm font-medium text-muted-foreground">
            Próximos hacia {s.hacia}
          </h2>
          <ItemGroup className="gap-2">
            {salidas.map((x) => (
              <Item key={x.quien.chofer.placa} variant="outline">
                <ItemMedia className="w-20 flex-col items-start gap-0 whitespace-nowrap">
                  <span className="font-semibold tabular-nums">{x.cuando}</span>
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{x.quien.chofer.nombre}</ItemTitle>
                  <ItemDescription>{x.nota}</ItemDescription>
                </ItemContent>
                <Badge variant="secondary">{puestos(x.libres)}</Badge>
              </Item>
            ))}
          </ItemGroup>
        </section>
      )}

      {/* 5. Quién trabaja y en qué sentido va cada uno */}
      <Trabajando escenario={e} />

      {/* key: al cambiar de sentido, la hoja empieza de nuevo (su lugar por defecto cambia) */}
      <HojaQuiero
        key={sentido}
        abierta={hoja}
        onCambiar={setHoja}
        s={s}
        sentido={sentido}
        conQuien={ahora[0] ?? pronto[0] ?? null}
        estado={estado}
        onConfirmar={(a) => (setAnotado(a), setHoja(false))}
      />
    </div>
  )
}

/** Solo para mirar la propuesta: el estado de la línea */
function Escenarios({ activo, onCambiar }: { activo: string; onCambiar: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
      <p className="text-xs font-medium text-muted-foreground">Propuesta · datos de ejemplo. Estado de la línea:</p>
      <div className="flex flex-wrap gap-1.5">
        {ESCENARIOS.map((x) => (
          <Button key={x.id} size="sm" variant={x.id === activo ? "default" : "outline"} onClick={() => onCambiar(x.id)}>
            {x.titulo}
          </Button>
        ))}
      </div>
    </div>
  )
}

const TONO = {
  ahora: { punto: "bg-emerald-500", aro: "ring-emerald-500/30" },
  pronto: { punto: "bg-amber-500", aro: "ring-amber-500/30" },
  nadie: { punto: "bg-muted-foreground", aro: "ring-border" },
}

/** Tres respuestas posibles: sí ahora · ahora no, pero viene uno · no hay servicio */
function Respuesta({
  estado,
  s,
  ahora,
  pronto,
  escenario: e,
  onQuiero,
}: {
  estado: "ahora" | "pronto" | "nadie"
  s: (typeof SENTIDO)[Sentido]
  ahora: TrabajoDemo[]
  pronto: TrabajoDemo[]
  escenario: EscenarioDemo
  onQuiero: () => void
}) {
  const primero = ahora[0]
  const viene = pronto[0]
  return (
    <Card className={cn("ring-2", TONO[estado].aro)}>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", TONO[estado].punto, estado !== "nadie" && "animate-pulse")} />
          {estado === "ahora" ? "Hay servicio hacia tu lado" : estado === "pronto" ? "Sin carro hacia tu lado ahora" : "Nadie trabajando"}
        </CardDescription>
        <CardTitle className="text-2xl">
          {estado === "ahora" ? "Sí, hay carro ahora" : estado === "pronto" ? "Ahora no, pero viene uno" : "Ahora no hay servicio"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {estado === "ahora" && primero && (
          <p>
            <strong className="text-foreground">{primero.chofer.nombre}</strong>{" "}
            {primero.ahora.minutos === 0 ? `está recogiendo en ${s.desde}` : `recoge en ${s.desde} en ~${primero.ahora.minutos} min`} ·{" "}
            {puestos(primero.ahora.libres)}
          </p>
        )}
        {estado === "pronto" && viene && (
          <p>
            <strong className="text-foreground">{viene.chofer.nombre}</strong>{" "}
            {viene.ahora.estado === "en_ruta"
              ? `está llevando gente hacia ${SENTIDO[viene.ahora.sentido].hacia}`
              : `está en un viaje hacia ${SENTIDO[viene.ahora.sentido].hacia}`}{" "}
            y después sale hacia {s.hacia} como a las <strong className="text-foreground">{viene.despues?.hora}</strong>
          </p>
        )}
        {estado === "nadie" && <p>{e.vuelven.length ? e.vuelven.join(" · ") : "Nadie dijo cuándo vuelve."}</p>}
      </CardContent>
      <CardFooter className="flex-col gap-2">
        {estado === "nadie" ? (
          <Button size="lg" variant="outline" className="h-12 w-full">
            <BellIcon data-icon="inline-start" />
            Avísame cuando haya carro
          </Button>
        ) : (
          <>
            <Button size="lg" className="h-12 w-full text-base" onClick={onQuiero}>
              Quiero irme hacia {s.hacia}
            </Button>
            {estado === "pronto" && (
              <Button variant="ghost" className="w-full">
                <BellIcon data-icon="inline-start" />
                Avísame cuando salga
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}

/** Cuántos quieren ir hacia ese lado y cuántos puestos vienen: la escasez, dicha de frente */
function Demanda({ esperan, puestos: hay, hacia }: { esperan: number; puestos: number; hacia: string }) {
  const falta = esperan > hay
  const ancho = esperan === 0 ? 100 : Math.min(100, Math.round((hay / esperan) * 100))
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
          <span className="flex items-center gap-1.5">
            <UsersIcon className="size-4 text-muted-foreground" />
            <strong>{esperan}</strong> quieren ir hacia {hacia}
          </span>
          <span className="whitespace-nowrap text-muted-foreground">{hay} puestos vienen</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className={cn("h-full rounded-full", falta ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${ancho}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {hay === 0 ? "Todavía no viene ningún puesto." : falta ? "Hay más gente que puestos: anótate temprano." : "Hay puestos para todos por ahora."}
        </p>
      </CardContent>
    </Card>
  )
}

/** Cada chofer trabajando: hacia dónde va ahora y qué hará después */
function Trabajando({ escenario: e }: { escenario: EscenarioDemo }) {
  if (e.trabajando.length === 0) return null
  return (
    <section className="flex flex-col gap-2" aria-labelledby="titulo-trabajando">
      <h2 id="titulo-trabajando" className="text-sm font-medium text-muted-foreground">
        Trabajando ahora · {e.trabajando.length}
      </h2>
      <ItemGroup>
        {e.trabajando.map((t) => {
          const Flecha = t.ahora.sentido === "centro" ? ArrowUpIcon : ArrowDownIcon
          const que =
            t.ahora.estado === "recogiendo"
              ? `Recogiendo en ${SENTIDO[t.ahora.sentido].desde}`
              : t.ahora.estado === "en_camino"
                ? `Va a recoger en ${SENTIDO[t.ahora.sentido].desde}`
                : `En camino, llega en ~${t.ahora.minutos} min`
          return (
            <Item key={t.chofer.placa} size="sm">
              <ItemMedia>
                <span className="grid size-8 place-items-center rounded-full bg-muted">
                  <Flecha className="size-4" />
                </span>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {t.chofer.nombre}
                  <span className="font-normal text-muted-foreground">· hacia {SENTIDO[t.ahora.sentido].hacia}</span>
                </ItemTitle>
                <ItemDescription>
                  {que} · {puestos(t.ahora.libres)}
                  {t.despues && ` · después, hacia ${SENTIDO[t.despues.sentido].hacia}`}
                </ItemDescription>
              </ItemContent>
            </Item>
          )
        })}
      </ItemGroup>
    </section>
  )
}

/** Una vez anotado, la respuesta se vuelve "tu viaje" */
function MiAnotacion({ anotado: a, s, onSalir }: { anotado: Anotado; s: (typeof SENTIDO)[Sentido]; onSalir: () => void }) {
  return (
    <Card className="ring-2 ring-primary">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <CheckIcon className="size-4" />
          Estás anotado hacia {s.hacia}
        </CardDescription>
        <CardTitle className="text-2xl">{a.conQuien ? `${a.conQuien} te recoge` : "Te avisamos cuando salga"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>
          {a.cuando} · en {a.lugar} · {a.personas === 1 ? "1 persona" : `${a.personas} personas`}
        </p>
        <p>Te bajas: {a.bajada}</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={onSalir}>
          Ya no voy
        </Button>
      </CardFooter>
    </Card>
  )
}

/** "Quiero irme": dónde estás, hasta dónde (para saber qué puestos se liberan en el camino) y cuántos van */
function HojaQuiero({
  abierta,
  onCambiar,
  s,
  sentido,
  conQuien,
  estado,
  onConfirmar,
}: {
  abierta: boolean
  onCambiar: (v: boolean) => void
  s: (typeof SENTIDO)[Sentido]
  sentido: Sentido
  conQuien: TrabajoDemo | null
  estado: "ahora" | "pronto" | "nadie"
  onConfirmar: (a: Anotado) => void
}) {
  const [lugar, setLugar] = useState(sentido === "centro" ? "Entrada de Las Cayenas" : "Gina")
  const [antes, setAntes] = useState(false)
  const [dondeBaja, setDondeBaja] = useState("")
  const [personas, setPersonas] = useState(1)
  return (
    <Sheet open={abierta} onOpenChange={onCambiar}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Quiero irme hacia {s.hacia}</SheetTitle>
          <SheetDescription>
            {estado === "ahora" && conQuien
              ? `Te anotamos con ${conQuien.chofer.nombre}`
              : conQuien
                ? `Te anotamos para cuando ${conQuien.chofer.nombre} salga hacia ${s.hacia}.`
                : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v2-lugar">¿Dónde estás?</Label>
            <Input id="v2-lugar" value={lugar} onChange={(ev) => setLugar(ev.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>¿Hasta dónde vas?</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={antes ? "outline" : "default"} onClick={() => setAntes(false)}>
                Hasta {s.final}
              </Button>
              <Button variant={antes ? "default" : "outline"} onClick={() => setAntes(true)}>
                Me bajo antes
              </Button>
            </div>
            {antes && <Input aria-label="Dónde te bajas" placeholder="Ej.: la redoma, el terminal…" value={dondeBaja} onChange={(ev) => setDondeBaja(ev.target.value)} />}
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
          <Button
            size="lg"
            className="h-12 text-base"
            onClick={() =>
              onConfirmar({
                conQuien: estado === "ahora" ? (conQuien?.chofer.nombre ?? null) : null,
                cuando:
                  estado === "ahora" && conQuien
                    ? conQuien.ahora.minutos === 0
                      ? "Está recogiendo ahora"
                      : `En ~${conQuien.ahora.minutos} min`
                    : `Sale como a las ${conQuien?.despues?.hora ?? "—"}`,
                lugar,
                bajada: antes ? dondeBaja || "antes del final" : s.final,
                personas,
              })
            }
          >
            <CheckIcon data-icon="inline-start" />
            Confirmar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
