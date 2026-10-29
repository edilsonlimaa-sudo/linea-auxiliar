"use client"

import { Loader2, Wifi, WifiOff } from "lucide-react"
import { usePathname, useSearchParams } from "next/navigation"
import * as React from "react"

import { estadoRed, estadoRedServidor, instalarRed, suscribirRed, terminoNavegacion } from "@/lib/nueva/red"
import { cn } from "@/lib/utils"

const VOLVIO_MS = 2500

/**
 * Con mala señal (§5.21): una barrita arriba en cuanto se toca un enlace (el toque se nota aunque la pantalla tarde) y
 * un aviso chico bajo la cabecera: "Sin conexión" o "Conexión lenta", y "Conexión de nuevo" un momento al volver. Así
 * se entiende que el problema es la internet y no la app. El estado lo lleva `lib/nueva/red.ts`.
 */
export function EstadoDeRed() {
  const red = React.useSyncExternalStore(suscribirRed, estadoRed, estadoRedServidor)
  const [volvio, setVolvio] = React.useState(false)
  const malo = red.sinRed || red.caida
  const antes = React.useRef(false)

  React.useEffect(() => instalarRed(), [])

  // Al pasar de mal a bien, "Conexión de nuevo" un momento
  React.useEffect(() => {
    const estaba = antes.current
    antes.current = malo || red.lenta
    if (!estaba || malo || red.lenta) return
    const mostrar = setTimeout(() => setVolvio(true), 0)
    const ocultar = setTimeout(() => setVolvio(false), VOLVIO_MS)
    return () => (clearTimeout(mostrar), clearTimeout(ocultar))
  }, [malo, red.lenta])

  const aviso = malo
    ? { icono: <WifiOff className="size-4" />, texto: "Sin conexión", detalle: "seguimos intentando" }
    : red.lenta
      ? { icono: <Loader2 className="size-4 animate-spin" />, texto: "Conexión lenta", detalle: "ya casi" }
      : volvio
        ? { icono: <Wifi className="size-4" />, texto: "Conexión de nuevo", detalle: null }
        : null

  return (
    <>
      <React.Suspense fallback={null}>
        <FinDeNavegacion />
      </React.Suspense>
      {red.navegando ? <div aria-hidden className="barra-navegando" /> : null}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4rem)] z-50 flex justify-center px-4"
      >
        {aviso ? (
          <p
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium shadow-lg",
              malo ? "bg-foreground text-background" : volvio && !red.lenta ? "bg-success text-success-foreground" : "bg-card text-foreground ring-1 ring-border"
            )}
          >
            {aviso.icono}
            {aviso.texto}
            {aviso.detalle ? <span className="font-normal opacity-70">· {aviso.detalle}</span> : null}
          </p>
        ) : null}
      </div>
    </>
  )
}

/** La ruta cambió: llegó la pantalla nueva y la barrita se va */
function FinDeNavegacion() {
  const ruta = usePathname()
  const busqueda = useSearchParams().toString()
  React.useEffect(() => terminoNavegacion(), [ruta, busqueda])
  return null
}
