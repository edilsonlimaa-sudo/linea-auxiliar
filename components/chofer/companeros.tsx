"use client"

import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, MessageCircleIcon, PhoneIcon, SnowflakeIcon, StarIcon } from "lucide-react"
import { useState } from "react"

import { promedioTexto } from "@/components/estrellas"
import { Asientos } from "@/components/pasajero/asientos"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Companero } from "@/lib/datos/inicio-chofer"
import { cn } from "@/lib/utils"
import { iniciales, libres, llegada, SENTIDOS, type Viaje } from "@/lib/viajes"

// Lo que está pasando primero: en ruta, recogiendo, llegando, en camino; los próximos al final
const PRIORIDAD: Record<string, number> = { en_ruta: 0, en_parada: 1, llegando: 2, en_camino: 3, programado: 4 }

/**
 * Compañeros en la ruta (docs/especificacion.md §8 Inicio del chofer) en una franja: sus caras y cuántos trabajan.
 * Tocarla abre la lista (quién y qué hace, R7) y tocar uno, su detalle para coordinarse: qué hace ahora y cuántos
 * lleva, sus próximos viajes, el mapa y WhatsApp / Llamar. Con uno solo se va directo a su detalle.
 * `enCabecera`: dentro del bloque azul (sin viajes); si no, como tarjeta al final de la gestión del viaje.
 */
export function Companeros({
  companeros,
  viajes,
  chofer,
  enCabecera = false,
}: {
  companeros: Companero[]
  viajes: Viaje[]
  chofer: string
  enCabecera?: boolean
}) {
  const [abierta, setAbierta] = useState(false)
  const [elegido, setElegido] = useState<Companero | null>(null)
  const n = companeros.length
  const solo = n === 1 ? companeros[0] : null
  const visibles = companeros.slice(0, 4)
  const resto = n - visibles.length
  const visto = elegido ?? solo

  const franja = cn(
    "flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
    enCabecera
      ? "border-t border-header-foreground/15 bg-header-foreground/10 px-5 hover:bg-header-foreground/15 focus-visible:ring-inset"
      : "rounded-2xl border-2 bg-card hover:bg-muted"
  )
  const texto = n === 0 ? "Nadie más está trabajando" : n === 1 ? `${solo!.nombre.split(" ")[0]} también trabaja` : `${n} compañeros trabajando`

  if (n === 0) {
    return (
      <p className={cn(franja, "font-normal", enCabecera ? "opacity-90 hover:bg-header-foreground/10" : "text-muted-foreground hover:bg-card")}>
        <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", enCabecera ? "bg-header-foreground/50" : "bg-muted-foreground")} />
        {texto}
      </p>
    )
  }

  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} className={franja}>
        <AvatarGroup className={enCabecera ? "*:data-[slot=avatar]:ring-header" : "*:data-[slot=avatar]:ring-card"}>
          {visibles.map((c) => (
            <Foto key={c.id} companero={c} className="size-9 text-sm" />
          ))}
          {resto > 0 && <AvatarGroupCount className="size-9 text-sm font-bold">+{resto}</AvatarGroupCount>}
        </AvatarGroup>
        <span className="min-w-0 flex-1 leading-tight">
          {texto}
          <span className={cn("block text-sm font-normal", enCabecera ? "opacity-90" : "text-muted-foreground")}>
            Qué hace cada uno y sus próximos viajes
          </span>
        </span>
        <ChevronRightIcon aria-hidden className={cn("size-5 shrink-0", enCabecera ? "text-signal" : "text-muted-foreground")} />
      </button>

      <Sheet open={abierta} onOpenChange={(v) => (setAbierta(v), !v && setElegido(null))}>
        <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
          {visto ? (
            <Detalle
              companero={visto}
              viajes={viajes.filter((v) => v.chofer_id === visto.id)}
              chofer={chofer}
              volver={solo ? undefined : () => setElegido(null)}
            />
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Compañeros en la ruta</SheetTitle>
                <SheetDescription className="text-base">{texto}. Toca uno para coordinarte.</SheetDescription>
              </SheetHeader>
              <ul className="flex flex-col gap-2 px-5 pb-6">
                {companeros.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setElegido(c)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-muted px-3 py-2.5 text-left hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <Foto companero={c} className="size-12" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 font-bold">
                          <span className="truncate">{c.nombre}</span>
                          <Estrellas valor={c.estrellas} />
                        </span>
                        <span className={cn("block text-[15px]", c.actividad === "Disponible" ? "text-muted-foreground" : "font-bold text-primary")}>
                          {c.actividad}
                        </span>
                        {c.placa && <span className="block font-mono text-sm font-bold tracking-wider text-muted-foreground">{c.placa}</span>}
                      </span>
                      <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function Detalle({
  companero: c,
  viajes,
  chofer,
  volver,
}: {
  companero: Companero
  viajes: Viaje[]
  chofer: string
  volver?: () => void // vuelve a la lista
}) {
  const porId = new Map<string, Viaje>(viajes.map((v) => [v.id, v]))
  const ordenados = [...viajes].sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado])
  const actual = ordenados.find((v) => v.estado !== "programado") ?? null
  const proximos = ordenados.filter((v) => v.estado === "programado")
  const digitos = c.telefono?.replace(/\D/g, "")
  const saludo = encodeURIComponent(`Hola ${c.nombre.split(" ")[0]}, soy ${chofer.split(" ")[0]}, de la Línea Auxiliar.`)

  return (
    <>
      <SheetHeader>
        {volver && (
          <button
            type="button"
            onClick={volver}
            className="-ml-2 inline-flex min-h-11 items-center gap-1 self-start rounded-full px-2 font-bold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <ChevronLeftIcon aria-hidden className="size-5" />
            Compañeros
          </button>
        )}
        <div className="flex items-center gap-3">
          <Foto companero={c} className="size-14 text-lg" />
          <div className="min-w-0">
            <SheetTitle className="flex flex-wrap items-center gap-x-2">
              {c.nombre} <Estrellas valor={c.estrellas} />
            </SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-x-2 text-[15px]">
              {c.placa && <span className="font-mono font-bold tracking-wider text-foreground">{c.placa}</span>}
              {c.unidad && <span>Unidad {c.unidad}</span>}
              {c.aire && (
                <span className="inline-flex items-center gap-1">
                  <SnowflakeIcon aria-hidden className="size-4" /> Con aire
                </span>
              )}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-5 pb-6">
        {/* Qué hace ahora y cuántos lleva */}
        <section aria-labelledby="companero-ahora" className="flex flex-col gap-2">
          <h3 id="companero-ahora" className="font-bold">
            Ahora
          </h3>
          {actual ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-muted p-3">
              <p className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{SENTIDOS[actual.sentido].corto}</Badge>
                <span className="font-bold">
                  {actual.estado === "en_ruta" ? `En ruta ${SENTIDOS[actual.sentido].hacia}` : llegada(actual, porId).principal}
                </span>
              </p>
              <Ocupacion viaje={actual} />
            </div>
          ) : (
            <p className="rounded-2xl bg-muted p-3 text-muted-foreground">Conectado, sin viaje publicado.</p>
          )}
        </section>

        {/* Lo que ya publicó para después: clave para no ir todos al mismo lado */}
        <section aria-labelledby="companero-proximos" className="flex flex-col gap-2">
          <h3 id="companero-proximos" className="font-bold">
            Próximos viajes
          </h3>
          {proximos.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">No ha publicado próximos viajes.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {proximos.map((v) => (
                <li key={v.id} className="flex flex-col gap-1.5 rounded-2xl border-2 p-3">
                  <p className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      <ClockIcon aria-hidden /> {SENTIDOS[v.sentido].corto}
                    </Badge>
                    <span className="font-bold">{llegada(v, porId).principal}</span>
                  </p>
                  <Ocupacion viaje={v} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Coordinarse */}
        <div className="flex flex-col gap-2">
          {digitos && (
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/${digitos}?text=${saludo}`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "whatsapp" })}
              >
                <MessageCircleIcon aria-hidden /> WhatsApp
              </a>
              <a href={`tel:+${digitos}`} className={buttonVariants({ variant: "outline" })}>
                <PhoneIcon aria-hidden /> Llamar
              </a>
            </div>
          )}
          <VerEnMapa choferId={c.id} chofer={c.nombre} yo={null} admin />
        </div>
      </div>
    </>
  )
}

function Ocupacion({ viaje: v }: { viaje: Viaje }) {
  const n = libres(v)
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
      <Asientos puestos={v.puestos} ocupados={Math.min(v.ocupados, v.puestos)} />
      <span>
        Lleva {Math.min(v.ocupados, v.puestos)} de {v.puestos}
      </span>
      {n > 0 ? <Badge variant="success">{n === 1 ? "1 libre" : `${n} libres`}</Badge> : <Badge variant="secondary">Lleno</Badge>}
    </p>
  )
}

function Foto({ companero: c, className }: { companero: Companero; className?: string }) {
  return (
    <Avatar className={className}>
      {c.fotoUrl && <AvatarImage src={c.fotoUrl} alt="" />}
      <AvatarFallback className="bg-secondary font-bold text-secondary-foreground">{iniciales(c.nombre)}</AvatarFallback>
    </Avatar>
  )
}

function Estrellas({ valor }: { valor: number | null }) {
  if (valor === null) return null
  return (
    <span className="inline-flex items-center gap-0.5 text-[15px] font-bold">
      <StarIcon aria-hidden className="size-4 fill-signal text-signal" />
      {promedioTexto(valor)}
      <span className="sr-only"> estrellas</span>
    </span>
  )
}
