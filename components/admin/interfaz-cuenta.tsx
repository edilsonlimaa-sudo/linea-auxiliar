"use client"

import { Loader2Icon, SmartphoneIcon, UndoIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { cambiarInterfaz } from "@/lib/acciones/interfaz"
import type { Interfaz } from "@/lib/datos/interfaz"
import { cn } from "@/lib/utils"

/**
 * La interfaz de una cuenta en su detalle (R83): en cuál está y el botón para pasarla a la nueva o devolverla. Vale al
 * siguiente toque de la persona (R84).
 */
export function InterfazCuenta({ id, nombre, interfaz }: { id: string; nombre: string; interfaz: Interfaz }) {
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()
  const nueva = interfaz === "nueva"
  const primero = nombre.split(" ")[0]

  const cambiar = () =>
    iniciar(async () => {
      const r = await cambiarInterfaz([id], nueva ? "clasica" : "nueva")
      setError(r.error)
      if (!r.error) setAbierto(false)
    })

  return (
    <section
      aria-labelledby="titulo-interfaz"
      className={cn("flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3", nueva && "border-primary")}
    >
      <SmartphoneIcon aria-hidden className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <h2 id="titulo-interfaz" className="font-bold">
          {nueva ? "Usa la interfaz nueva" : "Usa la interfaz clásica"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {nueva ? "Si algo no le funciona, devuélvela a la clásica." : "Pásala a la nueva para probarla con gente real."}
        </p>
      </div>
      <Button variant={nueva ? "outline" : "default"} disabled={pendiente} onClick={() => setAbierto(true)}>
        {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : nueva ? <UndoIcon aria-hidden /> : <SmartphoneIcon aria-hidden />}
        {nueva ? "Volver a la clásica" : "Pasar a la nueva"}
      </Button>
      {error && !abierto && (
        <p role="alert" className="w-full font-bold text-destructive">
          {error}
        </p>
      )}
      <Confirmar
        abierto={abierto}
        onCambiar={setAbierto}
        titulo={nueva ? `¿Devolver a ${primero} a la clásica?` : `¿Pasar a ${primero} a la interfaz nueva?`}
        descripcion={`${primero} la ve en su próximo toque en la app. Sus viajes, su lista y sus datos siguen iguales.`}
        confirmar={nueva ? "Sí, a la clásica" : "Sí, a la nueva"}
        cancelar="No, dejarla así"
        variante="signal"
        ocupado={pendiente}
        error={error}
        onConfirmar={cambiar}
      />
    </section>
  )
}
