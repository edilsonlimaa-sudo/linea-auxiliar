"use client"

import { Loader2Icon, SmartphoneIcon, UndoIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { cambiarInterfazDeTodos } from "@/lib/acciones/interfaz"

/**
 * R83 en grupo, debajo de "En la interfaz nueva": pasar a todos los pasajeros a la nueva (el lanzamiento) y, si algo
 * sale mal, devolverlos a todos a la clásica. Cada uno la ve en su próximo toque (R84). Los choferes no cambian.
 */
export function TodosALaNueva({ total, enLaNueva }: { total: number; enLaNueva: number }) {
  const [accion, setAccion] = useState<"nueva" | "clasica" | null>(null)
  const [error, setError] = useState<string>()
  const [hecho, setHecho] = useState<string>()
  const [pendiente, iniciar] = useTransition()
  const enLaClasica = total - enLaNueva

  const cambiar = (interfaz: "nueva" | "clasica") =>
    iniciar(async () => {
      const r = await cambiarInterfazDeTodos(interfaz)
      setError(r.error)
      if (r.error) return
      setAccion(null)
      const n = r.cambiados ?? 0
      setHecho(interfaz === "nueva" ? `${n} ${n === 1 ? "pasajero pasó" : "pasajeros pasaron"} a la nueva.` : `${n} ${n === 1 ? "pasajero volvió" : "pasajeros volvieron"} a la clásica.`)
    })

  return (
    <div className="flex flex-wrap items-center gap-2">
      {enLaClasica > 0 && (
        <Button variant="signal" disabled={pendiente} onClick={() => (setHecho(undefined), setAccion("nueva"))}>
          {pendiente && accion === "nueva" ? <Loader2Icon aria-hidden className="animate-spin" /> : <SmartphoneIcon aria-hidden />}
          Pasar a todos a la nueva ({enLaClasica})
        </Button>
      )}
      {enLaNueva > 0 && (
        <Button variant="outline" disabled={pendiente} onClick={() => (setHecho(undefined), setAccion("clasica"))}>
          {pendiente && accion === "clasica" ? <Loader2Icon aria-hidden className="animate-spin" /> : <UndoIcon aria-hidden />}
          Volver a todos a la clásica
        </Button>
      )}
      {hecho && (
        <p role="status" className="w-full font-bold text-success">
          {hecho}
        </p>
      )}
      {error && !accion && (
        <p role="alert" className="w-full font-bold text-destructive">
          {error}
        </p>
      )}
      <Confirmar
        abierto={accion !== null}
        onCambiar={(a) => !a && setAccion(null)}
        titulo={accion === "nueva" ? `¿Pasar a ${enLaClasica} pasajeros a la interfaz nueva?` : `¿Volver a ${enLaNueva} pasajeros a la clásica?`}
        descripcion={
          accion === "nueva"
            ? "Cada uno la ve en su próximo toque en la app. Sus viajes, su lista y sus datos siguen iguales. Los choferes no cambian."
            : "Cada uno vuelve a la clásica en su próximo toque. Úsalo solo si algo salió mal con la nueva."
        }
        confirmar={accion === "nueva" ? "Sí, pasar a todos" : "Sí, volver a todos"}
        cancelar="No, dejarlo así"
        variante={accion === "nueva" ? "signal" : "destructive"}
        ocupado={pendiente}
        error={error}
        onConfirmar={() => accion && cambiar(accion)}
      />
    </div>
  )
}
