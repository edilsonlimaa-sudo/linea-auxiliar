"use client"

import { ChevronRightIcon, Loader2Icon, LocateFixedIcon, LocateOffIcon, PowerIcon } from "lucide-react"
import { useState } from "react"

import { useCompartirUbicacion } from "@/components/chofer/compartir-ubicacion"
import { HojaDesconectar } from "@/components/chofer/hoja-desconectar"
import { useAccion } from "@/components/chofer/use-accion"
import { Button } from "@/components/ui/button"
import { conectarme } from "@/lib/acciones/chofer"
import { cn } from "@/lib/utils"

/**
 * Con viajes abiertos (docs/especificacion.md §8): conexión y ubicación en UNA línea discreta ("● Conectado · Ubicación
 * activa"). Tocarla abre la hoja para desconectarse (R6–R8), que pregunta si vuelve hoy (R60). Solo si el GPS
 * falla se vuelve un aviso amarillo con "Intentar de nuevo" (R40): lo normal no grita.
 */
export function EstadoServicio({ conectado, viajesAbiertos }: { conectado: boolean; viajesAbiertos: number }) {
  const { ejecutar, pendiente, error } = useAccion()
  const [hoja, setHoja] = useState(false)
  const { estado, reintentar } = useCompartirUbicacion(conectado)
  const fallaGps = conectado && (estado === "sin_permiso" || estado === "sin_gps")

  if (!conectado) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-2">
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-muted-foreground" />
          <p className="min-w-0 flex-1 font-bold">
            Desconectado
            <span className="block text-sm font-normal text-muted-foreground">Los pasajeros no te ven.</span>
          </p>
          <Button variant="outline" size="sm" disabled={pendiente} onClick={() => ejecutar(conectarme)}>
            {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <PowerIcon aria-hidden />}
            Conectarme
          </Button>
        </div>
        {error && (
          <p role="alert" className="font-bold text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setHoja(true)}
        className="flex min-h-11 w-full items-center gap-2 rounded-full px-1 text-left text-sm font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-success" />
        <span>Conectado</span>
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <span role="status" className={cn("flex min-w-0 items-center gap-1", fallaGps ? "text-warning" : "text-muted-foreground")}>
          {estado === "pidiendo" ? (
            <Loader2Icon aria-hidden className="size-4 shrink-0 animate-spin" />
          ) : fallaGps ? (
            <LocateOffIcon aria-hidden className="size-4 shrink-0" />
          ) : (
            <LocateFixedIcon aria-hidden className="size-4 shrink-0 text-success" />
          )}
          <span className="truncate">{estado === "pidiendo" ? "Buscando ubicación…" : fallaGps ? "Sin ubicación" : "Ubicación activa"}</span>
        </span>
        <ChevronRightIcon aria-hidden className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </button>

      {/* Lo único que merece ocupar espacio: los pasajeros no ven por dónde va */}
      {fallaGps && (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl border-2 border-warning/50 bg-warning-muted px-4 py-3">
          <p className="font-bold">
            Tus pasajeros no ven por dónde vas
            <span className="block text-sm font-normal text-muted-foreground">
              {estado === "sin_permiso" ? "Permite la ubicación para esta página en tu navegador." : "Revisa que el GPS esté encendido."}
            </span>
          </p>
          <Button variant="outline" size="sm" className="self-start" onClick={reintentar}>
            Intentar de nuevo
          </Button>
        </div>
      )}

      <HojaDesconectar
        abierta={hoja}
        onCambiar={setHoja}
        viajesAbiertos={viajesAbiertos}
        descripcion={fallaGps ? "Ahora los pasajeros ven tus viajes, pero no por dónde vas." : "Ahora los pasajeros ven tus viajes y por dónde vas."}
      />
    </div>
  )
}

/**
 * Sin viajes, dentro del bloque azul: el estado en una etiqueta y su interruptor al lado. Desconectarse también
 * pregunta si vuelve hoy (R60). Sin la cuota del día no hay "Conectarme" (R76): el aviso de la cuota va debajo.
 */
export function EstadoEnCabecera({ conectado, sinCuota = false }: { conectado: boolean; sinCuota?: boolean }) {
  const { ejecutar, pendiente, error } = useAccion()
  const [hoja, setHoja] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-full px-3 text-sm font-bold",
            conectado ? "bg-success-muted text-success" : "bg-header-foreground/15 text-header-foreground"
          )}
        >
          <span aria-hidden className={cn("size-2.5 rounded-full", conectado ? "bg-success" : "bg-header-foreground/60")} />
          {conectado ? "Conectado" : "Desconectado"}
        </span>
        {(conectado || !sinCuota) && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => (conectado ? setHoja(true) : ejecutar(conectarme))}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-bold underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-60"
          >
            {pendiente ? <Loader2Icon aria-hidden className="size-4 animate-spin" /> : <PowerIcon aria-hidden className="size-4" />}
            {conectado ? "Desconectarme" : "Conectarme"}
          </button>
        )}
      </div>
      {/* Desconectado sí necesita explicación: es la razón de que nadie lo vea */}
      {!conectado && (
        <p className="text-sm opacity-90">
          {sinCuota ? "Los pasajeros no te ven. Con la cuota del día te conectas y publicas." : "Los pasajeros no te ven. Publicar un viaje te conecta."}
        </p>
      )}
      {error && (
        <p role="alert" className="font-bold text-signal">
          {error}
        </p>
      )}
      <HojaDesconectar abierta={hoja} onCambiar={setHoja} viajesAbiertos={0} />
    </div>
  )
}
