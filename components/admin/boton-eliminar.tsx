"use client"

import { Trash2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { eliminarCuenta, type Historial } from "@/lib/acciones/admin"

const cuantos = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

function historialTexto({ viajes, reservas, calificaciones }: Historial) {
  return [
    viajes > 0 && cuantos(viajes, "viaje como chofer", "viajes como chofer"),
    reservas > 0 && cuantos(reservas, "reserva como pasajero", "reservas como pasajero"),
    calificaciones > 0 && cuantos(calificaciones, "calificación", "calificaciones"),
  ]
    .filter(Boolean)
    .join(", ")
}

// Eliminar para siempre una cuenta rechazada (R2). Pide confirmación: no se puede deshacer.
// Si tiene historial, un segundo paso dice qué tiene y pide confirmar que se borre también.
export function BotonEliminar({ id, nombre }: { id: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false)
  const [historial, setHistorial] = useState<Historial>()
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()

  const eliminar = () =>
    iniciar(async () => {
      const r = await eliminarCuenta(id, Boolean(historial))
      if (r.historial) setHistorial(r.historial)
      else if (r.error) setError(r.error)
      else setAbierto(false)
    })

  return (
    <div className="flex-1">
      <Button
        variant="outline"
        className="w-full border-destructive text-destructive hover:bg-destructive/10"
        onClick={() => {
          setError(undefined)
          setHistorial(undefined)
          setAbierto(true)
        }}
      >
        <Trash2Icon aria-hidden />
        Eliminar
      </Button>
      <Confirmar
        abierto={abierto}
        onCambiar={setAbierto}
        titulo={historial ? `${nombre} tiene historial` : `¿Eliminar la cuenta de ${nombre}?`}
        descripcion={
          historial ? (
            <>
              Tiene {historialTexto(historial)}. Si la eliminas, se borran también sus viajes y las calificaciones que dio o
              recibió. Sus reservas en viajes de otros choferes quedan como &quot;Cuenta eliminada&quot;. No se puede deshacer.
            </>
          ) : (
            "Se borran para siempre sus datos, sus fotos y su acceso. Su teléfono queda libre para registrarse de nuevo. No se puede deshacer."
          )
        }
        confirmar={historial ? "Sí, eliminar todo" : "Sí, eliminar"}
        cancelar="No, volver"
        ocupado={pendiente}
        error={error}
        onConfirmar={eliminar}
      />
    </div>
  )
}
