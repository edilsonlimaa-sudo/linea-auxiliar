"use client"

import { Loader2Icon, SnowflakeIcon } from "lucide-react"
import { useOptimistic, useState, useTransition } from "react"

import { cambiarAire } from "@/lib/acciones/perfil"
import { cn } from "@/lib/utils"

/** "Mi carro tiene aire acondicionado" (R55), en Mi carnet. Cambia al tocar; si falla, vuelve atrás. */
export function InterruptorAire({ tiene }: { tiene: boolean }) {
  const [valor, setValor] = useOptimistic(tiene)
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string>()

  const cambiar = (nuevo: boolean) =>
    iniciar(async () => {
      setError(undefined)
      setValor(nuevo)
      const r = await cambiarAire(nuevo)
      if (r.error) setError(r.error)
    })

  return (
    <div className="flex flex-col gap-2">
      <label className="flex min-h-15 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 has-focus-visible:ring-[3px] has-focus-visible:ring-ring">
        <SnowflakeIcon aria-hidden className={cn("size-6 shrink-0", valor ? "text-primary" : "text-muted-foreground")} />
        <span className="flex-1">
          <span className="block font-bold">Aire acondicionado</span>
          <span className="block text-sm text-muted-foreground">{valor ? "Los pasajeros ven “Con aire”" : "Tu carro no tiene aire"}</span>
        </span>
        {pendiente && <Loader2Icon aria-hidden className="size-5 animate-spin" />}
        {/* Interruptor accesible: un checkbox nativo con aspecto de switch */}
        <input type="checkbox" role="switch" checked={valor} onChange={(e) => cambiar(e.target.checked)} className="peer sr-only" />
        <span
          aria-hidden
          className={cn(
            "relative h-8 w-14 shrink-0 rounded-full transition-colors",
            valor ? "bg-primary" : "bg-muted-foreground/40",
            "after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-white after:transition-transform",
            valor && "after:translate-x-6"
          )}
        />
      </label>
      {error && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
