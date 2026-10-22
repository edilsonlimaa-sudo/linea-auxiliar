"use client"

import { ArrowRightIcon, SnowflakeIcon, StarIcon } from "lucide-react"
import { useState } from "react"

import { promedioTexto } from "@/components/estrellas"
import { Asientos } from "@/components/pasajero/asientos"
import { QuienVuelve } from "@/components/pasajero/quien-vuelve"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { ChoferEnPausa, ChoferEnServicio, ViajeConChofer } from "@/lib/datos/inicio-pasajero"
import { cn } from "@/lib/utils"
import { haciaEnFrase, iniciales, libres, llegada, SENTIDOS, type Sentido, type Viaje } from "@/lib/viajes"

// Lo que está pasando primero: en ruta, recogiendo, llegando, en camino; el próximo viaje al final
const PRIORIDAD: Record<string, number> = { en_ruta: 0, en_parada: 1, llegando: 2, en_camino: 3, programado: 4 }

type Situacion = {
  chofer: ChoferEnServicio
  actual: ViajeConChofer | null // lo que hace ahora
  despues: ViajeConChofer | null // su próximo viaje ya publicado
  vaAMiSentido: boolean // tiene un viaje (ahora o después) hacia el sentido escogido
}

/**
 * La línea ahora (docs/especificacion.md §8): la abre casi siempre quien no ve unidades en su sentido. Por chofer:
 * qué hace ahora, cuántos lleva, qué viene después y el mapa. Primero los que van hacia el sentido escogido.
 * `children` es la franja de Inicio que la abre.
 */
export function LineaAhora({
  choferes,
  enPausa = [],
  viajes,
  sentido,
  className,
  children,
}: {
  choferes: ChoferEnServicio[]
  enPausa?: ChoferEnPausa[] // R60: desconectados que dijeron si vuelven
  viajes: ViajeConChofer[]
  sentido: Sentido
  className?: string
  children: React.ReactNode
}) {
  const [abierta, setAbierta] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} className={className}>
        {children}
      </button>
      <Sheet open={abierta} onOpenChange={setAbierta}>
        <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>La línea ahora</SheetTitle>
            <SheetDescription className="text-base">
              {choferes.length === 0
                ? "Ningún chofer está trabajando en este momento."
                : `${choferes.length === 1 ? "1 chofer trabajando" : `${choferes.length} choferes trabajando`}: qué hace cada uno y qué viene después.`}
            </SheetDescription>
          </SheetHeader>
          {/* Solo con la hoja abierta: los "en ~5 min" se calculan con la hora del celular */}
          {abierta && <Contenido choferes={choferes} enPausa={enPausa} viajes={viajes} sentido={sentido} />}
        </SheetContent>
      </Sheet>
    </>
  )
}

function Contenido({
  choferes,
  enPausa,
  viajes,
  sentido,
}: {
  choferes: ChoferEnServicio[]
  enPausa: ChoferEnPausa[]
  viajes: ViajeConChofer[]
  sentido: Sentido
}) {
  const porId = new Map<string, Viaje>(viajes.map((v) => [v.id, v]))
  const situaciones: Situacion[] = choferes
    .map((chofer) => {
      const suyos = viajes.filter((v) => v.chofer_id === chofer.id).sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado])
      const actual = suyos.find((v) => v.estado !== "programado") ?? null
      const despues = suyos.find((v) => v.estado === "programado") ?? null
      return { chofer, actual, despues, vaAMiSentido: suyos.some((v) => v.sentido === sentido) }
    })
    // Primero quien va hacia el sentido escogido; después quien tiene viaje; al final los disponibles
    .sort((a, b) => Number(b.vaAMiSentido) - Number(a.vaAMiSentido) || Number(Boolean(b.actual)) - Number(Boolean(a.actual)))

  return (
    <div className="flex flex-col gap-3 px-4 pb-6">
      {situaciones.length === 0 ? (
        <p className="rounded-2xl bg-muted px-4 py-6 text-center text-muted-foreground">Cuando un chofer se conecte, aparece aquí.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {situaciones.map((s) => (
            <FilaChofer key={s.chofer.id} situacion={s} porId={porId} sentido={sentido} />
          ))}
        </ul>
      )}
      {/* R60: aparte de quienes trabajan, quién vuelve y a qué hora */}
      {enPausa.length > 0 && (
        <section aria-labelledby="titulo-en-pausa" className="mt-2 flex flex-col gap-3">
          <h3 id="titulo-en-pausa" className="font-bold">
            Desconectados
          </h3>
          <QuienVuelve choferes={enPausa} />
        </section>
      )}
    </div>
  )
}

function FilaChofer({ situacion: s, porId, sentido }: { situacion: Situacion; porId: Map<string, Viaje>; sentido: Sentido }) {
  const { chofer: c, actual, despues } = s
  const ahora = actual ? (actual.estado === "en_ruta" ? `En ruta ${SENTIDOS[actual.sentido].hacia}` : llegada(actual, porId).principal) : null
  const n = actual ? libres(actual) : 0

  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl border-2 bg-card p-3", s.vaAMiSentido && "border-primary")}>
      {/* Quién */}
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          {c.fotoUrl && <AvatarImage src={c.fotoUrl} alt="" />}
          <AvatarFallback className="bg-secondary font-bold text-secondary-foreground">{iniciales(c.nombre)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 font-bold">
            <span className="truncate">{c.nombre}</span>
            {c.estrellas !== null && (
              <span className="inline-flex items-center gap-0.5 text-sm">
                <StarIcon aria-hidden className="size-4 fill-signal text-signal" />
                {promedioTexto(c.estrellas)}
                <span className="sr-only"> estrellas</span>
              </span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {c.placa && <span className="font-mono font-bold tracking-wider text-foreground">{c.placa}</span>}
            {c.unidad && <span>Unidad {c.unidad}</span>}
            {c.aire && (
              <span className="inline-flex items-center gap-1">
                <SnowflakeIcon aria-hidden className="size-3.5" /> Aire
              </span>
            )}
          </p>
        </div>
        <VerEnMapa choferId={c.id} chofer={c.nombre} yo={null} compacto />
      </div>

      {/* Qué hace ahora y cuántos lleva */}
      {actual ? (
        <div className="flex flex-col gap-1.5 rounded-xl bg-muted px-3 py-2.5">
          <p className="flex flex-wrap items-center gap-2">
            <Badge variant={actual.sentido === sentido ? "default" : "secondary"}>{SENTIDOS[actual.sentido].corto}</Badge>
            <span className="font-bold">{ahora}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 text-sm">
            <Asientos puestos={actual.puestos} ocupados={Math.min(actual.ocupados, actual.puestos)} />
            <span>
              {Math.min(actual.ocupados, actual.puestos)} de {actual.puestos}
            </span>
            {n > 0 ? <Badge variant="success">{n === 1 ? "1 libre" : `${n} libres`}</Badge> : <Badge variant="secondary">Lleno</Badge>}
          </p>
        </div>
      ) : (
        <p className="rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">Disponible, sin viaje publicado</p>
      )}

      {/* Qué viene después: la respuesta para quien no ve unidades en su sentido */}
      {despues ? (
        <p className={cn("flex items-start gap-1.5 text-sm", despues.sentido === sentido && "font-bold text-primary")}>
          <ArrowRightIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Después: {llegada(despues, porId).principal.charAt(0).toLowerCase()}
            {llegada(despues, porId).principal.slice(1)} ({haciaEnFrase(despues.sentido)})
          </span>
        </p>
      ) : (
        actual && <p className="text-sm text-muted-foreground">Sin próximo viaje publicado</p>
      )}
    </li>
  )
}
