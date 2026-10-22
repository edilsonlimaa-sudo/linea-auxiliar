"use client"

import { EllipsisIcon, LightbulbIcon, Loader2Icon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useId, useState } from "react"

import { Opcion } from "@/components/chofer/publicar-viaje"
import { useAccion } from "@/components/chofer/use-accion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cambiarPuestos, cancelarViaje } from "@/lib/acciones/chofer"
import { MOTIVOS_CANCELAR, type MotivoCancelar, OPCION_CANCELAR } from "@/lib/motivos-cancelar"

/** Lo que se usa poco va aquí, lejos de los botones del día a día: cambiar puestos y cancelar el viaje (R24, R72) */
export function MasOpciones({
  viajeId,
  puestos,
  ocupados,
  enRuta,
  enCamino = false,
}: {
  viajeId: string
  puestos: number
  ocupados: number
  enRuta: boolean
  enCamino?: boolean // va a recoger: "cambiar la hora" se hace con Me atraso (R70)
}) {
  const [abierta, setAbierta] = useState(false)
  const [nuevos, setNuevos] = useState(puestos)
  const [cancelar, setCancelar] = useState(false)
  const puestosAccion = useAccion()
  const minimo = enRuta ? Math.max(1, ocupados) : 1

  return (
    <>
      <Sheet open={abierta} onOpenChange={(v) => (setAbierta(v), setNuevos(puestos))}>
        <SheetTrigger render={<Button variant="outline" className="h-auto min-h-11 w-full whitespace-normal" />}>
          <EllipsisIcon aria-hidden />
          Opciones
        </SheetTrigger>
        <SheetContent side="bottom" className="mx-auto max-w-2xl">
          <SheetHeader>
            <SheetTitle>Más opciones</SheetTitle>
            <SheetDescription className="text-base">Cambios que se hacen poco.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-6 px-4 pb-6">
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
              <p className="text-sm text-muted-foreground">No puedes bajar de los puestos que ya tienen reserva.</p>
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
                <p className="text-sm text-muted-foreground">Los anotados tendrán que escoger otra unidad.</p>
                <Button variant="outline" className="text-destructive" onClick={() => setCancelar(true)}>
                  <Trash2Icon aria-hidden />
                  Cancelar viaje
                </Button>
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={cancelar} onOpenChange={setCancelar}>
        <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
          {/* Se monta al abrir: cada vez empieza sin motivo escogido */}
          {cancelar && (
            <HojaCancelar
              viajeId={viajeId}
              ocupados={ocupados}
              enCamino={enCamino}
              onVolver={() => setCancelar(false)}
              onListo={() => (setCancelar(false), setAbierta(false))}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

/**
 * R72: por qué cancela, con un toque. Dos motivos tienen otra salida sin que nadie pierda su puesto (cambiar la hora
 * con Me atraso; los puestos se cambian en la misma hoja), pero puede cancelar igual.
 */
function HojaCancelar({
  viajeId,
  ocupados,
  enCamino,
  onVolver,
  onListo,
}: {
  viajeId: string
  ocupados: number
  enCamino: boolean
  onVolver: () => void
  onListo: () => void
}) {
  const [motivo, setMotivo] = useState<MotivoCancelar>()
  const [detalle, setDetalle] = useState("")
  const { ejecutar, pendiente, error } = useAccion()
  const idDetalle = useId()
  const sugerencia =
    motivo === "cambiar_hora" && enCamino
      ? { texto: "Usa «Me atraso» en tu viaje: das una hora nueva y nadie pierde su puesto.", boton: "Volver y usar Me atraso", alTocar: onListo }
      : motivo === "me_equivoque"
        ? { texto: "Si son los puestos, cámbialos en «Puestos del carro»: nadie pierde su lugar.", boton: "Volver a los puestos", alTocar: onVolver }
        : null

  return (
    <>
      <SheetHeader>
        <SheetTitle>¿Por qué cancelas?</SheetTitle>
        <SheetDescription className="text-base">
          {ocupados === 0
            ? "Nadie ha apartado todavía."
            : ocupados === 1
              ? "La persona anotada tendrá que escoger otra unidad."
              : `Las ${ocupados} personas anotadas tendrán que escoger otra unidad.`}
        </SheetDescription>
      </SheetHeader>
      <fieldset className="flex flex-col gap-2 px-4">
        <legend className="sr-only">Motivo</legend>
        {MOTIVOS_CANCELAR.map((m) => (
          <Opcion key={m} nombre="motivo-cancelar" elegida={motivo === m} onElegir={() => setMotivo(m)} className="justify-start text-left">
            {OPCION_CANCELAR[m]}
          </Opcion>
        ))}
        {motivo === "otra" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idDetalle} className="font-bold">
              ¿Qué pasó? <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Input id={idDetalle} value={detalle} maxLength={120} onChange={(e) => setDetalle(e.target.value)} />
          </div>
        )}
        {sugerencia && (
          <div role="status" className="flex flex-col gap-2 rounded-2xl bg-warning-muted p-3">
            <p className="flex items-start gap-2">
              <LightbulbIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
              {sugerencia.texto}
            </p>
            <Button variant="outline" className="w-full" onClick={sugerencia.alTocar}>
              {sugerencia.boton}
            </Button>
          </div>
        )}
      </fieldset>
      <SheetFooter>
        {error && (
          <p role="alert" className="font-bold text-destructive">
            {error}
          </p>
        )}
        <Button
          variant="destructive"
          size="lg"
          className="w-full"
          disabled={!motivo || pendiente}
          onClick={() => motivo && ejecutar(() => cancelarViaje(viajeId, motivo, detalle), onListo)}
        >
          {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <Trash2Icon aria-hidden />}
          {sugerencia ? "Cancelar igual" : "Cancelar el viaje"}
        </Button>
        <Button variant="secondary" size="lg" className="w-full" disabled={pendiente} autoFocus onClick={onVolver}>
          No, volver
        </Button>
      </SheetFooter>
    </>
  )
}
