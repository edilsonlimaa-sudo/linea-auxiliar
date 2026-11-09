"use client"

import { ChevronRight, Gift, Loader2 } from "lucide-react"
import * as React from "react"

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
import { pagarConViajeGratis } from "@/lib/acciones/pasajero"

const viajesTexto = (n: number) => (n === 1 ? "1 viaje gratis" : `${n} viajes gratis`)

/** R103: en Inicio, cuántos le regalaron y cuándo se usan */
export function TienesViajesGratis({ cuantos }: { cuantos: number }) {
  return (
    <section className="flex items-center gap-3 rounded-3xl border border-success/30 bg-success/10 p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success text-success-foreground">
        <Gift className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-lg font-semibold">Tienes {viajesTexto(cuantos)}</p>
        <p className="text-sm text-muted-foreground">Úsalos al pagar, cuando vayas a bordo.</p>
      </div>
    </section>
  )
}

/**
 * R103: a bordo, la otra forma de pagar, debajo de "Pagar a…": con un viaje gratis. Pide confirmar y no se deshace,
 * como un pago. El chofer lo ve en su lista al momento (R105).
 */
export function PagarConViajeGratis({ reservaId, quedan, personas, chofer }: { reservaId: string; quedan: number; personas: number; chofer: string }) {
  const nombre = chofer.split(" ")[0]
  const [pendiente, iniciar] = React.useTransition()
  const [error, setError] = React.useState<string>()
  const [abierta, setAbierta] = React.useState(false)
  const pagar = () =>
    iniciar(async () => {
      const r = await pagarConViajeGratis(reservaId)
      setError(r.error)
      if (!r.error) setAbierta(false)
    })

  return (
    <Drawer open={abierta} onOpenChange={(o) => (setAbierta(o), o && setError(undefined))} showSwipeHandle>
      <DrawerTrigger className="flex w-full items-center gap-3 rounded-3xl border border-success/30 bg-success/10 p-4 text-left outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success text-success-foreground">
          <Gift className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-lg font-semibold">Pagar con un viaje gratis</span>
          <span className="block text-sm text-muted-foreground">Te quedan {viajesTexto(quedan)}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      </DrawerTrigger>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          <DrawerTitle className="font-heading text-xl">¿Pagar este viaje con tu viaje gratis?</DrawerTitle>
          <DrawerDescription>
            {nombre} verá en su lista que ya pagaste.
            {personas > 1 ? " Es solo tu pasaje: tus acompañantes pagan el suyo." : ""} Te quedarán {viajesTexto(quedan - 1)}.
          </DrawerDescription>
        </DrawerHeader>
        {error ? (
          <p role="alert" className="px-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DrawerFooter>
          <Button size="lg" disabled={pendiente} onClick={pagar}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Gift />}
            Sí, pagar con mi viaje gratis
          </Button>
          <DrawerClose render={<Button variant="ghost" size="lg" />}>Ahora no</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

/** R105: ya pagó con un viaje gratis (en lugar de "Pagar a…"; con acompañantes, ese botón sigue debajo para ellos) */
export function PagasteConViajeGratis({ quedan, personas, chofer }: { quedan: number; personas: number; chofer: string }) {
  const nombre = chofer.split(" ")[0]
  return (
    <section className="flex items-center gap-3 rounded-3xl border border-success/30 bg-success/10 p-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success text-success-foreground">
        <Gift className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-lg font-semibold">Pagaste con un viaje gratis</p>
        <p className="text-sm text-muted-foreground">
          {personas > 1 ? `${nombre} ya lo ve. Tus acompañantes pagan su pasaje.` : `${nombre} ya lo ve: no le pagues nada.`}
          {quedan > 0 ? ` Te quedan ${viajesTexto(quedan)}.` : ""}
        </p>
      </div>
    </section>
  )
}
