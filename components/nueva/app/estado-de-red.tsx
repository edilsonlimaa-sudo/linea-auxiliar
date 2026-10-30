"use client"

import { Loader2, Wifi, WifiOff } from "lucide-react"
import { usePathname, useSearchParams } from "next/navigation"
import * as React from "react"

import { estadoRed, estadoRedServidor, instalarRed, suscribirRed, terminoNavegacion } from "@/lib/nueva/red"
import { cn } from "@/lib/utils"

const VOLVIO_MS = 2500

/**
 * Con mala señal (§5.21), lo de toda la app (en `AppShell`): instala la vigilancia de la red (`lib/nueva/red.ts`) y
 * muestra la barrita de arriba en cuanto se toca un enlace (el toque se nota aunque la pantalla tarde). El aviso de la
 * conexión es `FranjaDeRed`, dentro de la cabecera.
 */
export function EstadoDeRed() {
  const red = React.useSyncExternalStore(suscribirRed, estadoRed, estadoRedServidor)
  React.useEffect(() => instalarRed(), [])
  return (
    <>
      <React.Suspense fallback={null}>
        <FinDeNavegacion />
      </React.Suspense>
      {red.navegando ? <div aria-hidden className="barra-navegando" /> : null}
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

/**
 * La franja de la conexión, parte de la cabecera (`AppHeader`), a todo lo ancho bajo el título: "Sin conexión ·
 * seguimos intentando", "Conexión lenta · ya casi" y "Conexión de nuevo" un momento al volver. Sin nada que decir no
 * ocupa lugar. Su alto queda en `--franja-red` (en `<html>`) para lo que se pega bajo la cabecera (las pestañas del
 * chofer).
 */
export function FranjaDeRed() {
  const red = React.useSyncExternalStore(suscribirRed, estadoRed, estadoRedServidor)
  const [volvio, setVolvio] = React.useState(false)
  const malo = red.sinRed || red.caida
  const antes = React.useRef(false)

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
    ? { icono: <WifiOff className="size-3.5" />, texto: "Sin conexión", detalle: "seguimos intentando", tono: "bg-foreground text-background" }
    : red.lenta
      ? { icono: <Loader2 className="size-3.5 animate-spin" />, texto: "Conexión lenta", detalle: "ya casi", tono: "bg-muted text-foreground" }
      : volvio
        ? { icono: <Wifi className="size-3.5" />, texto: "Conexión de nuevo", detalle: null, tono: "bg-success text-success-foreground" }
        : null

  const visible = aviso !== null
  React.useEffect(() => {
    document.documentElement.style.setProperty("--franja-red", visible ? "1.75rem" : "0px")
  }, [visible])
  React.useEffect(() => () => document.documentElement.style.setProperty("--franja-red", "0px"), [])

  return (
    <div role="status" aria-live="polite" className="empty:hidden">
      {aviso ? (
        <p className={cn("flex h-7 items-center justify-center gap-1.5 text-xs font-medium", aviso.tono)}>
          {aviso.icono}
          {aviso.texto}
          {aviso.detalle ? <span className="font-normal opacity-70">· {aviso.detalle}</span> : null}
        </p>
      ) : null}
    </div>
  )
}
