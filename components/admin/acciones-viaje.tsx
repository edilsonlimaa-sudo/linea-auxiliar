"use client"

import { PowerOffIcon, XCircleIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { cerrarViajeAdmin, desconectarChoferAdmin } from "@/lib/acciones/admin"
import { cn } from "@/lib/utils"

/** Lo que hace el admin con su propia mano: confirma, espera y muestra el error si lo hay */
function useAccionAdmin(accion: () => Promise<{ error?: string }>) {
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()
  const abrir = () => {
    setError(undefined)
    setAbierto(true)
  }
  const confirmar = () =>
    iniciar(async () => {
      const r = await accion()
      if (r.error) setError(r.error)
      else setAbierto(false)
    })
  return { abierto, setAbierto, error, pendiente, abrir, confirmar }
}

/**
 * Cerrar un viaje (R69): sin salir se cancela; en ruta se termina. Quien estaba en la lista hacia Valle Grande
 * vuelve a su lugar.
 */
export function CerrarViaje({ viajeId, chofer, enRuta, haciaValle }: { viajeId: string; chofer: string; enRuta: boolean; haciaValle: boolean }) {
  const a = useAccionAdmin(() => cerrarViajeAdmin(viajeId))
  return (
    <>
      <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10" onClick={a.abrir}>
        <XCircleIcon aria-hidden />
        {enRuta ? "Terminar este viaje" : "Cancelar este viaje"}
      </Button>
      <Confirmar
        abierto={a.abierto}
        onCambiar={a.setAbierto}
        titulo={enRuta ? `¿Terminar el viaje de ${chofer}?` : `¿Cancelar el viaje de ${chofer}?`}
        descripcion={
          <>
            {enRuta
              ? "Quienes ya subieron quedan como viaje hecho. Quienes faltaba recoger quedan sin puesto."
              : "Quienes tenían puesto ven que el viaje se canceló y escogen otra unidad."}
            {haciaValle && " Quien estaba en la lista hacia Valle Grande vuelve a su mismo lugar."}
          </>
        }
        confirmar={enRuta ? "Sí, terminar el viaje" : "Sí, cancelar el viaje"}
        cancelar="No, dejarlo así"
        ocupado={a.pendiente}
        error={a.error}
        onConfirmar={a.confirmar}
      />
    </>
  )
}

/** Desconectar a un chofer (R69): cierra todos sus viajes abiertos, también el que va en ruta, y "terminó por hoy" */
export function DesconectarChofer({
  choferId,
  chofer,
  viajesAbiertos,
  className,
}: {
  choferId: string
  chofer: string
  viajesAbiertos?: number // sin dato: el texto no dice cuántos
  className?: string
}) {
  const a = useAccionAdmin(() => desconectarChoferAdmin(choferId))
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn("border-destructive text-destructive hover:bg-destructive/10", className)}
        onClick={a.abrir}
      >
        <PowerOffIcon aria-hidden />
        Desconectar
      </Button>
      <Confirmar
        abierto={a.abierto}
        onCambiar={a.setAbierto}
        titulo={`¿Desconectar a ${chofer}?`}
        descripcion={
          <>
            {viajesAbiertos === undefined
              ? "Queda desconectado y, si tiene viajes abiertos, se cierran (el que va en ruta se termina)."
              : viajesAbiertos === 0
                ? "Queda desconectado."
                : `Se ${viajesAbiertos === 1 ? "cierra su viaje abierto" : `cierran sus ${viajesAbiertos} viajes abiertos`} (el que va en ruta se termina) y queda desconectado.`}{" "}
            Los pasajeros ven que terminó por hoy. Quien estaba en la lista hacia Valle Grande vuelve a su mismo lugar.
          </>
        }
        confirmar="Sí, desconectar"
        cancelar="No, dejarlo así"
        ocupado={a.pendiente}
        error={a.error}
        onConfirmar={a.confirmar}
      />
    </>
  )
}
