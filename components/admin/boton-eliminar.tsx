"use client"

import { Trash2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { eliminarCuenta } from "@/lib/acciones/admin"

// Eliminar para siempre una cuenta rechazada (R2). Pide confirmación: no se puede deshacer.
export function BotonEliminar({ id, nombre }: { id: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()

  return (
    <div className="flex-1">
      <Button
        variant="outline"
        className="w-full border-destructive text-destructive hover:bg-destructive/10"
        onClick={() => {
          setError(undefined)
          setAbierto(true)
        }}
      >
        <Trash2Icon aria-hidden />
        Eliminar
      </Button>
      <Confirmar
        abierto={abierto}
        onCambiar={setAbierto}
        titulo={`¿Eliminar la cuenta de ${nombre}?`}
        descripcion="Se borran para siempre sus datos, sus fotos y su acceso. Su teléfono queda libre para registrarse de nuevo. No se puede deshacer."
        confirmar="Sí, eliminar"
        cancelar="No, volver"
        ocupado={pendiente}
        error={error}
        onConfirmar={() =>
          iniciar(async () => {
            const r = await eliminarCuenta(id)
            if (r.error) setError(r.error)
            else setAbierto(false)
          })
        }
      />
    </div>
  )
}
