"use client"

import { Loader2Icon, RouteIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { grabarRecorridos } from "@/lib/acciones/demanda"
import type { RecorridosResumen } from "@/lib/datos/demanda"
import { cn } from "@/lib/utils"

/**
 * Grabar recorridos (R92): el teléfono del chofer guarda su recorrido y lo sube en lotes, para ver después la ruta de
 * verdad, sus variantes y el tiempo de cada tramo. Se enciende y apaga aquí; muestra cuánto llegó en 7 días.
 */
export function GrabarRecorridos({ resumen: r }: { resumen: RecorridosResumen }) {
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()

  return (
    <section
      aria-labelledby="titulo-recorridos"
      className={cn("flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3", r.grabando && "border-success/50 bg-success-muted")}
    >
      <RouteIcon aria-hidden className={cn("size-5 shrink-0", r.grabando ? "text-success" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <h2 id="titulo-recorridos" className="font-bold">
          {r.grabando ? "Grabando recorridos" : "Grabar recorridos"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {r.grabando
            ? r.lotes === 0
              ? "Todavía no llegó nada: llega cuando los choferes viajan con la app abierta."
              : `En 7 días: ${r.puntos.toLocaleString("es-VE")} puntos de ${r.choferes} ${r.choferes === 1 ? "chofer" : "choferes"} · último ${r.ultimo}.`
            : "El teléfono del chofer guarda su recorrido en los viajes, para ver la ruta de verdad y el tiempo de cada tramo. Solo lo ves tú; se borra a los 60 días."}
        </p>
      </div>
      <Button
        variant="outline"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            const res = await grabarRecorridos(!r.grabando)
            setError(res.error)
          })
        }
      >
        {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : null}
        {r.grabando ? "Apagar" : "Encender"}
      </Button>
      {error && (
        <p role="alert" className="w-full font-bold text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
