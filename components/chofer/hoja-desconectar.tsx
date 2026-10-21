"use client"

import { Loader2Icon, PowerIcon } from "lucide-react"
import { useId, useState } from "react"

import { Opcion } from "@/components/chofer/publicar-viaje"
import { useAccion } from "@/components/chofer/use-accion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { desconectarme } from "@/lib/acciones/chofer"

const RAPIDOS = [
  { minutos: 30, texto: "30 min" },
  { minutos: 60, texto: "1 hora" },
  { minutos: 120, texto: "2 horas" },
]

/**
 * Desconectarse (R6, R8) diciendo si vuelve hoy (R60): "¿Vuelves a trabajar hoy?" → Sí, vuelvo (30 min, 1 hora,
 * 2 horas o a una hora) · No, terminé por hoy. Dos toques, sin escribir; los pasajeros ven a qué hora vuelve.
 * Si cancela viajes, lo dice aquí mismo antes del botón (en vez de una segunda confirmación).
 */
export function HojaDesconectar({
  abierta,
  onCambiar,
  viajesAbiertos,
  descripcion,
}: {
  abierta: boolean
  onCambiar: (abierta: boolean) => void
  viajesAbiertos: number
  descripcion?: string
}) {
  const { ejecutar, pendiente, error } = useAccion()
  const [vuelve, setVuelve] = useState<boolean | null>(null)
  const [cuando, setCuando] = useState<number | "hora" | null>(null)
  const [hora, setHora] = useState("")
  const idHora = useId()

  const limpiar = () => (setVuelve(null), setCuando(null), setHora(""))
  const listo = vuelve === false || (vuelve === true && (typeof cuando === "number" || (cuando === "hora" && hora !== "")))

  const desconectar = () =>
    ejecutar(
      () => desconectarme(vuelve ? (cuando === "hora" ? { hora } : { minutos: cuando as number }) : null),
      () => (onCambiar(false), limpiar())
    )

  return (
    <Sheet open={abierta} onOpenChange={(v) => (onCambiar(v), !v && limpiar())}>
      <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>¿Te desconectas?</SheetTitle>
          <SheetDescription className="text-base">
            {descripcion ?? "Los pasajeros dejan de verte."} Diles si vuelves: así saben si vale la pena esperar.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-lg font-bold">¿Vuelves a trabajar hoy?</legend>
            <div className="grid grid-cols-2 gap-2">
              <Opcion nombre="vuelve" elegida={vuelve === true} onElegir={() => setVuelve(true)}>
                Sí, vuelvo
              </Opcion>
              <Opcion nombre="vuelve" elegida={vuelve === false} onElegir={() => (setVuelve(false), setCuando(null))}>
                No, terminé por hoy
              </Opcion>
            </div>
          </fieldset>

          {vuelve && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-lg font-bold">¿En cuánto?</legend>
              <div className="grid grid-cols-3 gap-2">
                {RAPIDOS.map((r) => (
                  <Opcion key={r.minutos} nombre="cuando-vuelve" elegida={cuando === r.minutos} onElegir={() => setCuando(r.minutos)}>
                    {r.texto}
                  </Opcion>
                ))}
                <Opcion nombre="cuando-vuelve" elegida={cuando === "hora"} onElegir={() => setCuando("hora")} className="col-span-3">
                  A una hora
                </Opcion>
              </div>
              {cuando === "hora" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={idHora} className="font-bold">
                    Vuelvo a las
                  </label>
                  <Input id={idHora} type="time" value={hora} onChange={(e) => setHora(e.target.value)} autoFocus className="w-40" />
                </div>
              )}
            </fieldset>
          )}

          {/* R8: desconectarse cancela lo publicado. Se dice antes del botón, no después */}
          {viajesAbiertos > 0 && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 font-bold text-destructive">
              {viajesAbiertos === 1
                ? "Se cancela el viaje que publicaste y tus pasajeros tendrán que escoger otra unidad."
                : `Se cancelan los ${viajesAbiertos} viajes que publicaste y tus pasajeros tendrán que escoger otra unidad.`}
            </p>
          )}
        </div>

        <SheetFooter>
          {error && (
            <p role="alert" className="font-bold text-destructive">
              {error}
            </p>
          )}
          <Button size="lg" className="w-full" disabled={!listo || pendiente} onClick={desconectar}>
            {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <PowerIcon aria-hidden />}
            Desconectarme
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onCambiar(false)}>
            No, sigo trabajando
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
