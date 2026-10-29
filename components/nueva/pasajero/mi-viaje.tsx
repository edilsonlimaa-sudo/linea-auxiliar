"use client"

import { Hand, Loader2, MapPin, MessageCircle, Phone, Snowflake, Star } from "lucide-react"
import * as React from "react"

import { AppHeader } from "@/components/nueva/app/app-header"
import { carroLabel, ChoferAvatar, personasLabel } from "@/components/nueva/pasajero/comunes"
import { PagarAlChofer } from "@/components/nueva/pasajero/pago-movil-card"
import { MapaCarro } from "@/components/nueva/pasajero/mapa-carro"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/nueva/ui/drawer"
import { Input } from "@/components/nueva/ui/input"
import { avisarQueLlegue, cambiarLugar, liberarPuesto } from "@/lib/acciones/pasajero"
import type { MiViajeVista } from "@/lib/nueva/vistas"

/**
 * Mi viaje con reserva (§8), en los dos sentidos: el estado, el chofer y cuándo llega, dónde lo recogen, "Ya estoy en
 * el sitio", llamar o escribir al chofer y "Ya no voy". A bordo, sin llamar ni escribir: "Pagar a…" (el Pago Móvil en
 * una hoja). A bordo lo baja el chofer.
 */
export function MiViaje({ viaje }: { viaje: MiViajeVista }) {
  const { unidad } = viaje
  const { chofer } = unidad
  const aBordo = viaje.estado === "a_bordo"
  const telefono = viaje.telefonoChofer?.replace(/\D/g, "")

  return (
    <>
      <AppHeader title="Mi viaje" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4 text-card-foreground">
          <div className="flex items-center justify-between gap-2">
            <Badge variant={aBordo ? "default" : "secondary"}>{viaje.titulo}</Badge>
            <span className="text-sm text-muted-foreground">{viaje.puesto ?? personasLabel(viaje.personas)}</span>
          </div>
          <p className="text-sm text-muted-foreground">{viaje.subtitulo}</p>
          <div className="flex items-center gap-3">
            <ChoferAvatar chofer={chofer} className="size-14" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-lg font-semibold">{chofer.nombre}</p>
              <p className="truncate text-sm text-muted-foreground">
                {carroLabel(chofer.carro)}
                {chofer.carro ? ` · ${chofer.carro.placa}` : ""}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {chofer.estrellas !== null ? (
                  <>
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    {chofer.estrellas.toFixed(1).replace(".", ",")}
                  </>
                ) : (
                  "Sin calificaciones aún"
                )}
                {chofer.carro?.aire ? (
                  <>
                    <span aria-hidden>·</span>
                    <Snowflake className="size-3" /> Aire
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-primary/10 p-3 text-primary">
            <p className="text-xs font-medium tracking-wide uppercase opacity-80">{viaje.ruta}</p>
            <p className="font-heading text-lg font-semibold">{unidad.llegada.principal}</p>
            {unidad.llegada.detalle ? <p className="text-sm opacity-90">{unidad.llegada.detalle}</p> : null}
          </div>
          {/* R41: por dónde viene el carro, en vivo (el mismo mapa de la clásica) */}
          {!aBordo ? <MapaCarro choferId={chofer.id} chofer={chofer.nombre} yo={viaje.yo} className="w-full" /> : null}
          {/* A bordo ya no hace falta llamar ni escribir: lo importante es pagar */}
          {telefono && !aBordo ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="lg" render={<a href={`tel:+${telefono}`} />} nativeButton={false}>
                <Phone /> Llamar
              </Button>
              <Button
                variant="outline"
                size="lg"
                render={
                  <a
                    href={`https://wa.me/${telefono}?text=${encodeURIComponent("Hola, soy pasajero de la Línea Auxiliar. Aparté puesto en tu carro.")}`}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
                nativeButton={false}
              >
                <MessageCircle /> WhatsApp
              </Button>
            </div>
          ) : null}
        </section>

        {!aBordo ? (
          <section className="flex items-center gap-3 rounded-3xl border bg-card p-4">
            <MapPin className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Te recoge en</p>
              <p className="truncate font-medium">{viaje.lugar}</p>
            </div>
            {viaje.puedeCambiarLugar ? <CambiarDondeDrawer reservaId={viaje.reservaId} lugar={viaje.lugar} /> : null}
          </section>
        ) : null}

        {viaje.pago ? <PagarAlChofer datos={viaje.pago} chofer={chofer.nombre} pasaje={viaje.pasaje} /> : null}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {viaje.puedeAvisarListo ? <YaEstoyEnElSitio reservaId={viaje.reservaId} listo={viaje.listo} /> : null}
          {viaje.puedeSoltar ? <YaNoVoyDrawer reservaId={viaje.reservaId} chofer={chofer.nombre} /> : null}
        </div>
      </div>
    </>
  )
}

/** "Ya estoy en el sitio" (R23): el chofer lo ve en su lista */
function YaEstoyEnElSitio({ reservaId, listo }: { reservaId: string; listo: boolean }) {
  const [pendiente, iniciar] = React.useTransition()
  const [error, setError] = React.useState<string>()
  const cambiar = (valor: boolean) =>
    iniciar(async () => {
      const r = await avisarQueLlegue(reservaId, valor)
      setError(r.error)
    })

  if (listo) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-3xl bg-secondary p-4 text-center">
        <p className="font-medium">El chofer sabe que ya estás en el sitio</p>
        <button type="button" onClick={() => cambiar(false)} disabled={pendiente} className="text-sm text-muted-foreground underline underline-offset-4">
          Me equivoqué, todavía no estoy
        </button>
      </div>
    )
  }
  return (
    <>
      <Button size="lg" disabled={pendiente} onClick={() => cambiar(true)}>
        {pendiente ? <Loader2 className="animate-spin" /> : <Hand />}
        Ya estoy en el sitio
      </Button>
      {error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </>
  )
}

/** "Ya no voy" (R20): el puesto pasa al siguiente */
function YaNoVoyDrawer({ reservaId, chofer }: { reservaId: string; chofer: string }) {
  const [pendiente, iniciar] = React.useTransition()
  const [error, setError] = React.useState<string>()
  return (
    <Drawer showSwipeHandle>
      <DrawerTrigger render={<Button variant="ghost" size="lg" />}>Ya no voy</DrawerTrigger>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          <DrawerTitle className="font-heading text-xl">¿Ya no vas en este viaje?</DrawerTitle>
          <DrawerDescription>
            Tu puesto en el carro de {chofer.split(" ")[0]} pasa a la siguiente persona. Si cambias de idea, tendrás que apartar de
            nuevo.
          </DrawerDescription>
        </DrawerHeader>
        {error ? (
          <p role="alert" className="px-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DrawerFooter>
          <Button
            variant="destructive"
            size="lg"
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                // Si sale bien, la acción lleva a /n
                const r = await liberarPuesto(reservaId)
                if (r?.error) setError(r.error)
              })
            }
          >
            {pendiente ? <Loader2 className="animate-spin" /> : null}
            Sí, ya no voy
          </Button>
          <DrawerClose render={<Button variant="ghost" size="lg" />}>No, sigo en el viaje</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

/** Cambiar dónde lo recogen (R27): un campo */
function CambiarDondeDrawer({ reservaId, lugar }: { reservaId: string; lugar: string }) {
  const [open, setOpen] = React.useState(false)
  const [valor, setValor] = React.useState(lugar)
  const [error, setError] = React.useState<string | null>(null)
  const [pendiente, iniciar] = React.useTransition()

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    const texto = valor.trim()
    if (!texto) return setError("Escribe dónde estás.")
    const datos = new FormData()
    datos.set("lugar", texto)
    iniciar(async () => {
      const r = await cambiarLugar(reservaId, datos)
      if (r.error) setError(r.error)
      else setOpen(false)
    })
  }

  return (
    <Drawer open={open} onOpenChange={(o) => (setOpen(o), o && (setValor(lugar), setError(null)))} showSwipeHandle>
      <DrawerTrigger render={<Button variant="outline" size="sm" />}>Cambiar</DrawerTrigger>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <form onSubmit={enviar} className="flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="font-heading text-xl">¿Dónde te recogemos?</DrawerTitle>
            <DrawerDescription>El chofer ve el cambio de inmediato.</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2 px-4">
            <Input
              value={valor}
              onChange={(e) => (setValor(e.target.value), error && setError(null))}
              maxLength={60}
              aria-invalid={error ? true : undefined}
              aria-label="Dónde estás"
              autoComplete="off"
            />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 p-4">
            <Button type="submit" size="lg" disabled={pendiente}>
              {pendiente ? <Loader2 className="animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
