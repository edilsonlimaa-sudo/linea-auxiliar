"use client"

import { FlaskConicalIcon, Loader2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { marcarPrueba } from "@/lib/acciones/demanda"
import { cn } from "@/lib/utils"

/**
 * Cuenta de prueba en el detalle (R86): marcada, lo suyo no cuenta en Demanda y oferta. Se deshace con el mismo botón,
 * por eso no pide confirmación.
 */
export function CuentaPrueba({ id, prueba }: { id: string; prueba: boolean }) {
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()

  return (
    <section
      aria-labelledby="titulo-prueba"
      className={cn("flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3", prueba && "border-warning bg-warning-muted")}
    >
      <FlaskConicalIcon aria-hidden className={cn("size-5 shrink-0", prueba ? "text-warning" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <h2 id="titulo-prueba" className="font-bold">
          {prueba ? "Cuenta de prueba" : "Cuenta real"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {prueba ? "Lo suyo no cuenta en Demanda y oferta." : "Si es para probar la app, márcala: así no cuenta en Demanda y oferta."}
        </p>
      </div>
      <Button
        variant="outline"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            const r = await marcarPrueba(id, !prueba)
            setError(r.error)
          })
        }
      >
        {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : null}
        {prueba ? "Es una cuenta real" : "Marcar de prueba"}
      </Button>
      {error && (
        <p role="alert" className="w-full font-bold text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
