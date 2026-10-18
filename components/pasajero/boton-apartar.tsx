"use client"

import { Loader2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { apartarPuesto } from "@/lib/acciones/pasajero"

/**
 * Apartar de un toque (R27): el lugar ya lo dio al avisar que espera. Si sale bien, la acción abre Mi viaje.
 * Al cambiarse de unidad (R22) pide confirmación, porque se cancela la reserva anterior (R18).
 */
export function BotonApartar({
  viajeId,
  texto,
  variante = "default",
  reservaAnterior,
}: {
  viajeId: string
  texto: string
  variante?: "default" | "outline"
  reservaAnterior?: string | null
}) {
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string>()
  const [confirmar, setConfirmar] = useState(false)
  const apartar = () =>
    iniciar(async () => {
      setError(undefined)
      const r = await apartarPuesto(viajeId)
      setError(r?.error)
    })

  return (
    <div className="flex flex-col gap-2">
      <Button variant={variante} className="w-full" disabled={pendiente} onClick={() => (reservaAnterior ? setConfirmar(true) : apartar())}>
        {pendiente && <Loader2Icon aria-hidden className="animate-spin" />}
        {pendiente ? "Apartando…" : texto}
      </Button>
      {error && !confirmar && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      {reservaAnterior && (
        <Confirmar
          abierto={confirmar}
          onCambiar={setConfirmar}
          titulo="¿Cambiarte a esta unidad?"
          descripcion={`Se cancela tu reserva en el carro de ${reservaAnterior} y apartas en este.`}
          confirmar="Sí, cambiarme"
          cancelar="No, me quedo donde estoy"
          variante="signal"
          ocupado={pendiente}
          error={error}
          onConfirmar={apartar}
        />
      )}
    </div>
  )
}
