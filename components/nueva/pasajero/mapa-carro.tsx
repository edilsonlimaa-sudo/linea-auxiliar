"use client"

import { Loader2, Map as MapIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/nueva/ui/drawer"
import { Mapa, usePosicionEnVivo } from "@/components/pasajero/ver-en-mapa"
import { hace } from "@/lib/fechas"
import { distanciaMetros, distanciaTexto, EN_VIVO_MS, type Punto } from "@/lib/mapa"

/**
 * Por dónde viene el carro (R41), en la interfaz nueva: una hoja que se baja arrastrando, con el carro visto desde
 * arriba girando hacia donde va. Solo mientras está abierta lee la posición (en vivo, R42). `yo` (si lo hay) es el
 * lugar del pasajero, para la distancia. children = lo que se toca para abrirla (si no, un botón "Ver en el mapa").
 */
export function MapaCarro({
  choferId,
  chofer,
  yo = null,
  className,
  children,
}: {
  choferId: string
  chofer: string
  yo?: Punto | null
  className?: string
  children?: React.ReactNode
}) {
  const [abierta, setAbierta] = React.useState(false)
  const { carro, setCarro, ahora } = usePosicionEnVivo(choferId, abierta)

  const nombre = chofer.split(" ")[0]
  const enVivo = carro ? ahora - new Date(carro.actualizadaEn).getTime() < EN_VIVO_MS : false
  const cuando = carro ? hace(carro.actualizadaEn) : ""
  const distancia = carro && yo ? distanciaTexto(distanciaMetros(carro, yo)) : null
  const senal = carro ? { enVivo, texto: enVivo ? "En vivo" : `Sin señal · ${cuando}` } : null

  return (
    <Drawer
      open={abierta}
      onOpenChange={(v) => {
        setAbierta(v)
        if (!v) setCarro(undefined)
      }}
      showSwipeHandle
    >
      {children ? (
        <DrawerTrigger className={className}>{children}</DrawerTrigger>
      ) : (
        <DrawerTrigger render={<Button variant="outline" size="lg" className={className} />}>
          <MapIcon />
          Ver en el mapa
        </DrawerTrigger>
      )}
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          <DrawerTitle className="font-heading text-xl">Por dónde viene {nombre}</DrawerTitle>
          <DrawerDescription aria-live="polite">
            {carro === undefined
              ? "Buscando el carro…"
              : carro === null
                ? `${nombre} no está compartiendo su ubicación ahora.`
                : !enVivo
                  ? `Sin señal: la última ubicación es de ${cuando}.`
                  : distancia
                    ? `Está a ${distancia} de ti · actualizado ${cuando}.`
                    : `Actualizado ${cuando}.`}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {carro === undefined ? (
            <p className="flex h-[50svh] items-center justify-center gap-2 rounded-3xl border bg-muted text-sm text-muted-foreground">
              <Loader2 aria-hidden className="size-5 animate-spin" /> Cargando…
            </p>
          ) : carro === null ? null : (
            <Mapa carro={carro} yo={yo} senal={senal} nueva />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
