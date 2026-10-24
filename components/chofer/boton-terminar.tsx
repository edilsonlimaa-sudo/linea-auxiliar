"use client"

import { FlagIcon, Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { Confirmar } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { avanzarViaje } from "@/lib/acciones/chofer"
import { cn } from "@/lib/utils"

const MIN_EN_RUTA = 10 // antes de esto, Terminar viaje pide confirmación (R71)

/**
 * "Terminar viaje" del viaje en ruta, con sus dos cuidados: sin decir qué hace después, abre esa pregunta (R73); a los
 * pocos minutos de salir, confirma (R71). Va como botón fijo (signal) o dentro del viaje en ruta abierto (R75).
 */
export function BotonTerminar({
  viajeId,
  salioEn,
  destino,
  sinVuelta = false,
  faltaDespues = false,
  variante = "signal",
  texto = "Terminar viaje",
  className,
}: {
  viajeId: string
  salioEn?: string | null // cuándo salió (estado_en del viaje en ruta)
  destino?: string // dónde deja a la gente, en frase ("en Valle Grande")
  sinVuelta?: boolean // sin otro viaje publicado: se recuerda que no hace falta terminar para publicarla
  faltaDespues?: boolean // sin decir qué hace después (R73)
  variante?: "signal" | "outline"
  texto?: string
  className?: string
}) {
  const router = useRouter()
  const { ejecutar, pendiente, error } = useAccion()
  const [haceMin, setHaceMin] = useState<number | null>(null)

  const terminar = () => {
    if (faltaDespues) return router.replace("/inicio?vuelta=1", { scroll: false })
    const min = salioEn ? (Date.now() - new Date(salioEn).getTime()) / 60_000 : Infinity
    if (min < MIN_EN_RUTA) setHaceMin(Math.max(0, Math.floor(min)))
    else ejecutar(() => avanzarViaje(viajeId, "finalizado"))
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        variant={variante}
        size={variante === "signal" ? "lg" : "default"}
        // Dentro del viaje en ruta abierto, del alto de Opciones y Subió alguien (R75)
        className={cn("w-full", variante === "outline" && "h-auto min-h-11")}
        disabled={pendiente}
        onClick={terminar}
      >
        {pendiente && haceMin === null ? <Loader2Icon aria-hidden className="animate-spin" /> : <FlagIcon aria-hidden />}
        {texto}
      </Button>
      {error && haceMin === null && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      <Confirmar
        abierto={haceMin !== null}
        onCambiar={(v) => !v && setHaceMin(null)}
        titulo={haceMin === 0 ? "Acabas de salir" : `Saliste hace ${haceMin === 1 ? "1 minuto" : `${haceMin} minutos`}`}
        descripcion={
          <>
            ¿Ya dejaste a todos{destino ? ` ${destino}` : ""}? Al terminar, tus pasajeros ven que llegaron y tú quedas libre.
            {sinVuelta && (
              <strong className="mt-2 block text-foreground">Para publicar tu vuelta no hace falta terminar: usa «Agregar otro viaje».</strong>
            )}
          </>
        }
        confirmar="Sí, terminar"
        variante="signal"
        cancelar="No, sigo en ruta"
        destacarCancelar // R71: lo normal a los pocos minutos es seguir en ruta
        ocupado={pendiente}
        error={error}
        onConfirmar={() => ejecutar(() => avanzarViaje(viajeId, "finalizado"), () => setHaceMin(null))}
      />
    </div>
  )
}
