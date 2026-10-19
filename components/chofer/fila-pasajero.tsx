"use client"

import { CheckIcon, HandIcon, Loader2Icon, MapPinIcon, MessageCircleIcon, NavigationIcon, PhoneIcon, UserXIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { Confirmar } from "@/components/confirmar"
import { Avatar } from "@/components/foto/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { marcarNoVino, marcarSeBajo, marcarSubio, quitarAnotado, responderPedido } from "@/lib/acciones/chofer"
import type { FilaChofer } from "@/lib/datos/inicio-chofer"
import { cn } from "@/lib/utils"
import type { EstadoViaje } from "@/lib/viajes"

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
        "flex flex-col gap-3 rounded-2xl border-2 bg-card p-3",
        fila.pendiente && "border-destructive bg-destructive/5",
        !fila.confirmado && !enRuta && "border-dashed"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-label={`Puesto ${fila.posicion}`}
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full text-xl font-bold",
            fila.confirmado || enRuta ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {fila.posicion}
        </span>
        {/* La foto ayuda a reconocer a quien espera en la calle (R54); sin foto basta el nombre */}
        {fila.fotoUrl && <Avatar url={fila.fotoUrl} nombre={fila.nombre} className="size-11" />}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-lg font-bold">{fila.nombre}</span>
            {!fila.conApp && fila.nombre !== "Pasajero sin app" && <span className="rounded-full bg-muted px-2 py-0.5 text-sm">Sin app</span>}
            {fila.listo && fila.conApp && !enRuta && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-muted px-2 py-0.5 text-sm font-bold text-success">
                <HandIcon aria-hidden className="size-4" />
                Ya está en el sitio
              </span>
            )}
            {fila.pendiente && <span className="rounded-full border-2 border-destructive px-2 py-0.5 text-sm font-bold text-destructive">Pide que pases por él</span>}
            {enRuta && fila.estado === "activa" && !fila.pendiente && (
              <span className="rounded-full bg-warning-muted px-2 py-0.5 text-sm font-bold text-warning">Vas por él</span>
            )}
          </p>
          {(fila.lugar || gps) && (
            <p className="mt-0.5 flex items-start gap-1.5 text-lg leading-snug">
              <MapPinIcon aria-hidden className="mt-1 size-5 shrink-0 text-muted-foreground" />
              <span>{fila.lugar ?? "Solo compartió su GPS"}</span>
            </p>
          )}
        </div>
      </div>

      {/* Contacto y cómo llegar: botones de una mano */}
      {(telefono || gps) && (
        <div className="flex flex-wrap gap-2">
          {telefono && (
            <a href={`tel:+${telefono}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <PhoneIcon aria-hidden />
              Llamar
            </a>
          )}
          {telefono && (
            <a href={`https://wa.me/${telefono}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <MessageCircleIcon aria-hidden />
              WhatsApp
            </a>
          )}
          {gps && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${gps}`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <NavigationIcon aria-hidden />
              Cómo llegar
            </a>
          )}
          {gps && (
            <a href={`https://waze.com/ul?ll=${gps}&navigate=yes`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Waze
            </a>
          )}
        </div>
      )}

      {/* Acciones sobre la reserva */}
      <div className="flex flex-wrap gap-2 empty:hidden">
        {fila.pendiente && (
          <>
            <Button size="sm" disabled={pendiente} onClick={() => ejecutar(() => responderPedido(fila.id, true))}>
              {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <CheckIcon aria-hidden />}
              Voy
            </Button>
            <Button size="sm" variant="outline" disabled={pendiente} onClick={() => ejecutar(() => responderPedido(fila.id, false))}>
              <XIcon aria-hidden />
              Sigo, no puedo
            </Button>
          </>
        )}
        {enRuta && fila.estado === "activa" && !fila.pendiente && (
          <>
            <Button size="sm" disabled={pendiente} onClick={() => ejecutar(() => marcarSubio(fila.id))}>
              <CheckIcon aria-hidden />
              Subió
            </Button>
            <Button size="sm" variant="outline" className="text-destructive" disabled={pendiente} onClick={noVino}>
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
        {recogiendo && fila.conApp && fila.confirmado && (
          <Button size="sm" variant="outline" className="text-destructive" disabled={pendiente} onClick={noVino}>
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
