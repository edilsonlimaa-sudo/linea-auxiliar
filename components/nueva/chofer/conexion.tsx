"use client"

import { Clock, Loader2, LocateFixed, LocateOff, Moon, Power, Sun } from "lucide-react"
import * as React from "react"

import { useCompartirUbicacion } from "@/components/chofer/compartir-ubicacion"
import { useAccion } from "@/components/chofer/use-accion"
import { ErrorAccion, Opcion } from "@/components/nueva/chofer/comun"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/nueva/ui/drawer"
import { Input } from "@/components/nueva/ui/input"
import { conectarme, desconectarme } from "@/lib/acciones/chofer"
import { cn } from "@/lib/utils"

/**
 * El estado del chofer en la cabecera (R6–R8): Conectado o Desconectado. Tocarlo conecta o abre "¿Vuelves a trabajar
 * hoy?" (R60). Sin la cuota del día no se ofrece conectarse (R76).
 */
export function EstadoEnCabecera({ conectado, sinCuota, viajesAbiertos }: { conectado: boolean; sinCuota: boolean; viajesAbiertos: number }) {
  const { ejecutar, pendiente, error } = useAccion()
  const [hoja, setHoja] = React.useState(false)
  const puedeTocar = conectado || !sinCuota

  return (
    <>
      <button
        type="button"
        disabled={!puedeTocar || pendiente}
        onClick={() => (conectado ? setHoja(true) : ejecutar(conectarme))}
        aria-label={conectado ? "Conectado. Tocar para desconectarte" : "Desconectado. Tocar para conectarte"}
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Badge variant={conectado ? "default" : "outline"} className={cn("h-7 px-2.5", !conectado && "text-muted-foreground")}>
          {pendiente ? <Loader2 className="size-3 animate-spin" /> : <Power className="size-3" />}
          {conectado ? "Conectado" : "Desconectado"}
        </Badge>
      </button>
      {error ? <span className="sr-only" role="alert">{error}</span> : null}
      <DesconectarDrawer abierta={hoja} onCambiar={setHoja} viajesAbiertos={viajesAbiertos} />
    </>
  )
}

/**
 * La ubicación (R40): con viajes abiertos, el teléfono comparte por dónde va. Lo normal es una línea discreta; si el
 * GPS falla, un aviso con "Intentar de nuevo" (los pasajeros no ven por dónde va).
 */
export function Ubicacion({ activa }: { activa: boolean }) {
  const { estado, reintentar } = useCompartirUbicacion(activa)
  if (!activa) return null
  const falla = estado === "sin_permiso" || estado === "sin_gps"
  if (!falla) {
    return (
      <p role="status" className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
        {estado === "pidiendo" ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4 text-primary" />}
        {estado === "pidiendo" ? "Buscando tu ubicación…" : "Tus pasajeros ven por dónde vas"}
      </p>
    )
  }
  return (
    <section role="alert" className="flex flex-col gap-3 rounded-3xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <LocateOff className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">Tus pasajeros no ven por dónde vas</p>
          <p className="text-sm text-muted-foreground">
            {estado === "sin_permiso" ? "Permite la ubicación para esta app en tu navegador." : "Revisa que el GPS esté encendido."}
          </p>
        </div>
      </div>
      <Button variant="outline" onClick={reintentar}>
        Intentar de nuevo
      </Button>
    </section>
  )
}

const RAPIDOS = [
  { minutos: 30, texto: "30 min" },
  { minutos: 60, texto: "1 hora" },
  { minutos: 120, texto: "2 horas" },
]

/**
 * Desconectarse (R6, R8) diciendo si vuelve hoy (R60). La hora es opcional: sin hora los pasajeros ven "vuelve más
 * tarde". Si cancela viajes, lo dice antes del botón.
 */
export function DesconectarDrawer({
  abierta,
  onCambiar,
  viajesAbiertos,
}: {
  abierta: boolean
  onCambiar: (abierta: boolean) => void
  viajesAbiertos: number
}) {
  const { ejecutar, pendiente, error } = useAccion()
  const [vuelve, setVuelve] = React.useState<boolean | null>(null)
  const [cuando, setCuando] = React.useState<number | "hora" | null>(null)
  const [hora, setHora] = React.useState("")
  const limpiar = () => (setVuelve(null), setCuando(null), setHora(""))
  const listo = vuelve === false || (vuelve === true && (cuando !== "hora" || hora !== ""))

  const desconectar = () =>
    ejecutar(
      () => desconectarme(!vuelve ? null : cuando === "hora" ? { hora } : typeof cuando === "number" ? { minutos: cuando } : "sin_hora"),
      () => (onCambiar(false), limpiar())
    )

  return (
    <Drawer open={abierta} onOpenChange={(v) => (onCambiar(v), !v && limpiar())} showSwipeHandle>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          <DrawerTitle className="font-heading text-xl">¿Vuelves a trabajar hoy?</DrawerTitle>
          <DrawerDescription>Los pasajeros ven tu respuesta en &quot;La línea ahora&quot;.</DrawerDescription>
        </DrawerHeader>
        <div className="flex max-h-[60svh] flex-col gap-4 overflow-y-auto px-4">
          <div className="grid grid-cols-2 gap-2">
            <Opcion nombre="vuelve" elegida={vuelve === true} onElegir={() => setVuelve(true)}>
              <Sun className="size-4" /> Sí, vuelvo
            </Opcion>
            <Opcion nombre="vuelve" elegida={vuelve === false} onElegir={() => (setVuelve(false), setCuando(null))}>
              <Moon className="size-4" /> Terminé por hoy
            </Opcion>
          </div>
          {vuelve ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-medium">
                ¿En cuánto? <span className="font-normal text-muted-foreground">(si sabes)</span>
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {RAPIDOS.map((r) => (
                  <Opcion key={r.minutos} nombre="cuando-vuelve" elegida={cuando === r.minutos} onElegir={() => setCuando(cuando === r.minutos ? null : r.minutos)}>
                    {r.texto}
                  </Opcion>
                ))}
                <Opcion nombre="cuando-vuelve" elegida={cuando === "hora"} onElegir={() => setCuando(cuando === "hora" ? null : "hora")} className="col-span-3">
                  <Clock className="size-4" /> A una hora
                </Opcion>
              </div>
              {cuando === "hora" ? (
                <label className="flex items-center gap-3">
                  <span className="font-medium">Vuelvo a las</span>
                  <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="w-36" autoFocus />
                </label>
              ) : null}
            </fieldset>
          ) : null}
          {/* R8: desconectarse cancela lo publicado. Se dice antes del botón */}
          {viajesAbiertos > 0 ? (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {viajesAbiertos === 1
                ? "Se cancela el viaje que publicaste y tus pasajeros tendrán que escoger otro carro."
                : `Se cancelan los ${viajesAbiertos} viajes que publicaste y tus pasajeros tendrán que escoger otro carro.`}
            </p>
          ) : null}
        </div>
        <DrawerFooter>
          <ErrorAccion error={error} />
          <Button size="lg" disabled={!listo || pendiente} onClick={desconectar}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Power />}
            Desconectarme
          </Button>
          <Button variant="ghost" size="lg" onClick={() => onCambiar(false)}>
            Seguir conectado
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
