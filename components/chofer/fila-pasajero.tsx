"use client"

import { CheckIcon, HandIcon, Loader2Icon, MapPinIcon, MessageCircleIcon, NavigationIcon, PhoneIcon, UserXIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { Confirmar } from "@/components/confirmar"
import { Avatar } from "@/components/foto/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { marcarNoVino, marcarSeBajo, marcarSubio, quitarAnotado, responderPedido } from "@/lib/acciones/chofer"
import type { FilaChofer } from "@/lib/datos/inicio-chofer"
import { cn } from "@/lib/utils"
import { textoPersonas, textoPuestos, type EstadoViaje } from "@/lib/viajes"

type Pregunta = {
  titulo: string
  descripcion: string
  confirmar: string
  accion: () => Promise<{ ok?: boolean; error?: string }>
  variante?: "destructive" | "signal" // signal: no es una pérdida (p. ej. se bajó en su destino)
}

/**
 * Una persona en la lista del carro (vista del chofer). Lo más grande: el puesto y DÓNDE recogerla (R25).
 * Las acciones cambian según el estado del viaje: antes de salir "No vino"; en ruta, pedidos y "Se bajó".
 */
export function FilaPasajero({ fila, estadoViaje }: { fila: FilaChofer; estadoViaje: EstadoViaje }) {
  const { ejecutar, pendiente, error } = useAccion()
  const [pregunta, setPregunta] = useState<Pregunta | null>(null)
  const enRuta = estadoViaje === "en_ruta"
  const recogiendo = estadoViaje === "en_camino" || estadoViaje === "llegando" || estadoViaje === "en_parada"
  const telefono = fila.telefono?.replace(/\D/g, "")
  const gps = fila.lat !== null && fila.lng !== null ? `${fila.lat},${fila.lng}` : null

  const confirmarY = (p: Pregunta) => setPregunta(p)
  const noVino = () =>
    confirmarY({
      titulo: `¿${fila.nombre} no vino?`,
      descripcion: fila.confirmado && !enRuta ? "Su puesto pasa a la siguiente persona de la lista." : "Se libera su puesto.",
      confirmar: "Sí, no vino",
      accion: () => marcarNoVino(fila.id),
    })

  return (
    <li
      className={cn(
        "flex flex-col gap-2.5 rounded-2xl border-2 bg-card p-3",
        fila.pendiente && "border-destructive bg-destructive/5",
        !fila.confirmado && !enRuta && "border-dashed"
      )}
    >
      {/* Pedido en el camino (R29): lo único en rojo de la lista, arriba de todo */}
      {fila.pendiente && <p className="text-sm font-bold tracking-wide text-destructive uppercase">Pide que pases por él</p>}
      <div className="flex items-center gap-3">
        <Puesto fila={fila} activo={fila.confirmado || enRuta} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-lg leading-tight font-bold">{fila.nombre}</span>
            {/* Con acompañantes (R57): se ve de lejos cuántos suben */}
            {fila.personas > 1 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-sm font-bold text-primary-foreground">+{fila.personas - 1}</span>
            )}
            {!fila.conApp && fila.nombre !== "Pasajero sin app" && <span className="rounded-full bg-muted px-2 py-0.5 text-sm">Sin app</span>}
            {fila.listo && fila.conApp && !enRuta && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-muted px-2 py-0.5 text-sm font-bold text-success">
                <HandIcon aria-hidden className="size-4" />
                En el sitio
              </span>
            )}
          </p>
          {(fila.lugar || gps) && (
            <p className="mt-0.5 flex items-start gap-1 leading-snug">
              <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{fila.lugar ?? "Solo compartió su GPS"}</span>
            </p>
          )}
        </div>
        {/* Llamar, WhatsApp, Cómo llegar y Waze: a un toque, sin llenar la fila de botones */}
        {(telefono || gps) && <Contacto fila={fila} telefono={telefono} gps={gps} />}
      </div>

      {/* Acciones sobre la reserva */}
      <div className="flex flex-wrap gap-2 empty:hidden">
        {fila.pendiente && (
          <>
            <Button size="sm" className="flex-1" disabled={pendiente} onClick={() => ejecutar(() => responderPedido(fila.id, true))}>
              {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <CheckIcon aria-hidden />}
              Voy
            </Button>
            <Button size="sm" variant="outline" className="flex-1" disabled={pendiente} onClick={() => ejecutar(() => responderPedido(fila.id, false))}>
              <XIcon aria-hidden />
              Sigo, no puedo
            </Button>
          </>
        )}
        {enRuta && fila.estado === "activa" && !fila.pendiente && (
          <>
            <Button size="sm" className="flex-1" disabled={pendiente} onClick={() => ejecutar(() => marcarSubio(fila.id))}>
              <CheckIcon aria-hidden />
              Subió
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-destructive" disabled={pendiente} onClick={noVino}>
              <UserXIcon aria-hidden />
              No vino
            </Button>
          </>
        )}
        {enRuta && fila.estado === "subio" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pendiente}
            onClick={() =>
              confirmarY({
                titulo: `¿${fila.nombre} se bajó?`,
                // Para el pasajero su viaje termina aquí y se le pide calificar (R38, R45): por eso se confirma
                descripcion: fila.conApp
                  ? "Su puesto queda libre y para esa persona el viaje termina: la app le pedirá que te califique."
                  : "Su puesto queda libre.",
                confirmar: "Sí, se bajó",
                variante: "signal",
                accion: () => marcarSeBajo(fila.id),
              })
            }
          >
            Se bajó
          </Button>
        )}
        {recogiendo && fila.conApp && fila.confirmado && !fila.pendiente && (
          <Button size="sm" variant="ghost" className="-ml-2 text-destructive" disabled={pendiente} onClick={noVino}>
            <UserXIcon aria-hidden />
            No vino
          </Button>
        )}
        {!enRuta && !fila.conApp && (
          <Button
            size="sm"
            variant="outline"
            disabled={pendiente}
            onClick={() =>
              confirmarY({
                titulo: `¿Quitar a ${fila.nombre}?`,
                descripcion: "Lo anotaste tú a mano. Su puesto queda libre.",
                confirmar: "Sí, quitar",
                accion: () => quitarAnotado(fila.id),
              })
            }
          >
            <XIcon aria-hidden />
            Quitar
          </Button>
        )}
      </div>

      {error && !pregunta && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}

      {pregunta && (
        <Confirmar
          abierto
          onCambiar={(v) => !v && setPregunta(null)}
          titulo={pregunta.titulo}
          descripcion={pregunta.descripcion}
          confirmar={pregunta.confirmar}
          variante={pregunta.variante}
          cancelar="No, volver"
          ocupado={pendiente}
          error={error}
          onConfirmar={() => ejecutar(pregunta.accion, () => setPregunta(null))}
        />
      )}
    </li>
  )
}

/**
 * El puesto en grande ("2–4" si es un grupo). Con foto (R54), la foto ayuda a reconocerla en la calle y el puesto va
 * como etiqueta encima: las dos cosas en el espacio de una.
 */
function Puesto({ fila, activo }: { fila: FilaChofer; activo: boolean }) {
  const texto = fila.personas > 1 ? `${fila.desde}–${fila.hasta}` : String(fila.desde)
  const color = activo ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
  if (fila.fotoUrl) {
    return (
      <span className="relative shrink-0" aria-label={textoPuestos(fila.desde, fila.hasta)}>
        <Avatar url={fila.fotoUrl} nombre={fila.nombre} className="size-12" />
        <span className={cn("absolute -right-1.5 -bottom-1 grid h-6 min-w-6 place-items-center rounded-full px-1 text-sm font-bold ring-2 ring-card", color)}>
          {texto}
        </span>
      </span>
    )
  }
  return (
    <span
      aria-label={textoPuestos(fila.desde, fila.hasta)}
      className={cn("grid h-12 min-w-12 shrink-0 place-items-center rounded-full px-2 text-xl font-bold", fila.personas > 1 && "text-base", color)}
    >
      {texto}
    </span>
  )
}

/** Contacto y cómo llegar en una hoja: el chofer abre solo lo que necesita y la lista queda limpia. */
function Contacto({ fila, telefono, gps }: { fila: FilaChofer; telefono: string | undefined; gps: string | null }) {
  const grande = buttonVariants({ variant: "outline" })
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="icon-sm" className="rounded-full" aria-label={`Contactar a ${fila.nombre}`} />}>
        <PhoneIcon aria-hidden />
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-2xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar url={fila.fotoUrl} nombre={fila.nombre} className="size-14 text-lg" />
            <div className="min-w-0">
              <SheetTitle>{fila.nombre}</SheetTitle>
              <SheetDescription className="text-base">
                {textoPuestos(fila.desde, fila.hasta)}
                {fila.personas > 1 && ` · ${textoPersonas(fila.personas)}`}
                {fila.lugar && ` · ${fila.lugar}`}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-2.5 px-5 pb-6">
          {telefono && (
            <a href={`tel:+${telefono}`} className={grande}>
              <PhoneIcon aria-hidden />
              Llamar
            </a>
          )}
          {telefono && (
            <a href={`https://wa.me/${telefono}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "whatsapp" })}>
              <MessageCircleIcon aria-hidden />
              WhatsApp
            </a>
          )}
          {gps && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${gps}`} target="_blank" rel="noreferrer" className={grande}>
              <NavigationIcon aria-hidden />
              Cómo llegar
            </a>
          )}
          {gps && (
            <a href={`https://waze.com/ul?ll=${gps}&navigate=yes`} target="_blank" rel="noreferrer" className={grande}>
              Waze
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
