"use client"

import { EllipsisIcon, Loader2Icon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { Confirmar } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cambiarPuestos, cancelarViaje } from "@/lib/acciones/chofer"

/** Lo que se usa poco va aquí, lejos de los botones del día a día: cambiar puestos y cancelar el viaje (R24) */
export function MasOpciones({ viajeId, puestos, ocupados, enRuta }: { viajeId: string; puestos: number; ocupados: number; enRuta: boolean }) {
  const [abierta, setAbierta] = useState(false)
  const [nuevos, setNuevos] = useState(puestos)
  const [cancelar, setCancelar] = useState(false)
  const puestosAccion = useAccion()
  const cancelarAccion = useAccion()
  const minimo = enRuta ? Math.max(1, ocupados) : 1

  return (
    <>
      <Sheet open={abierta} onOpenChange={(v) => (setAbierta(v), setNuevos(puestos))}>
        <SheetTrigger render={<Button variant="ghost" className="w-full" />}>
          <EllipsisIcon aria-hidden />
          Más opciones del viaje
        </SheetTrigger>
        <SheetContent side="bottom" className="mx-auto max-w-2xl">
          <SheetHeader>
            <SheetTitle>Más opciones</SheetTitle>
            <SheetDescription className="text-base">Cambios que se hacen poco.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-5 pb-6">
            <section className="flex flex-col gap-2">
              <h3 className="font-bold">Puestos del carro</h3>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon-lg" aria-label="Un puesto menos" disabled={nuevos <= minimo} onClick={() => setNuevos((n) => n - 1)}>
                  <MinusIcon aria-hidden />
                </Button>
                <output aria-live="polite" className="min-w-16 text-center text-4xl font-bold tabular-nums">
                  {nuevos}
                </output>
                <Button variant="outline" size="icon-lg" aria-label="Un puesto más" disabled={nuevos >= 8} onClick={() => setNuevos((n) => n + 1)}>
                  <PlusIcon aria-hidden />
                </Button>
              </div>
              <p className="text-[15px] text-muted-foreground">Al cambiar los puestos, la lista se reordena sola: entran o salen los de la lista de espera.</p>
              <Button
                disabled={nuevos === puestos || puestosAccion.pendiente}
                onClick={() => puestosAccion.ejecutar(() => cambiarPuestos(viajeId, nuevos), () => setAbierta(false))}
              >
                {puestosAccion.pendiente && <Loader2Icon aria-hidden className="animate-spin" />}
                Guardar {nuevos} puestos
              </Button>
              {puestosAccion.error && (
                <p role="alert" className="font-bold text-destructive">
                  {puestosAccion.error}
                </p>
              )}
            </section>

            {!enRuta && (
              <section className="flex flex-col gap-2 border-t pt-5">
                <h3 className="font-bold">Cancelar este viaje</h3>
                <p className="text-[15px] text-muted-foreground">Los anotados tendrán que escoger otra unidad.</p>
                <Button variant="outline" className="text-destructive" onClick={() => setCancelar(true)}>
                  <Trash2Icon aria-hidden />
                  Cancelar viaje
                </Button>
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Confirmar
        abierto={cancelar}
        onCambiar={setCancelar}
        titulo="¿Cancelar este viaje?"
        descripcion={
          ocupados === 0
            ? "Nadie ha apartado todavía."
            : ocupados === 1
              ? "La persona anotada tendrá que escoger otra unidad."
              : `Las ${ocupados} personas anotadas tendrán que escoger otra unidad.`
        }
        confirmar="Sí, cancelar el viaje"
        cancelar="No, volver"
        ocupado={cancelarAccion.pendiente}
        error={cancelarAccion.error}
        onConfirmar={() => cancelarAccion.ejecutar(() => cancelarViaje(viajeId), () => (setCancelar(false), setAbierta(false)))}
      />
    </>
  )
}
