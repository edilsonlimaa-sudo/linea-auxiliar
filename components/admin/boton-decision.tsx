"use client"

import { CheckIcon, XIcon } from "lucide-react"
import { useState, useTransition } from "react"
import { useFormStatus } from "react-dom"

import { Confirmar } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { decidirCuenta } from "@/lib/acciones/admin"

function BotonAprobar() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      <CheckIcon aria-hidden />
      {pending ? "Guardando…" : "Aprobar"}
    </Button>
  )
}

const datos = (id: string, decision: "aprobar" | "rechazar") => {
  const fd = new FormData()
  fd.set("id", id)
  fd.set("decision", decision)
  return fd
}

// Aprobar / rechazar una cuenta. Rechazar pide confirmación para evitar un toque accidental.
export function BotonDecision({ id, nombre, aprobar }: { id: string; nombre: string; aprobar: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, iniciar] = useTransition()

  if (aprobar) {
    return (
      <form action={() => decidirCuenta(datos(id, "aprobar"))} className="flex-1">
        <BotonAprobar />
      </form>
    )
  }
  return (
    <div className="flex-1">
      <Button variant="destructive" className="w-full" onClick={() => setAbierto(true)}>
        <XIcon aria-hidden />
        Rechazar
      </Button>
      <Confirmar
        abierto={abierto}
        onCambiar={setAbierto}
        titulo={`¿Rechazar la cuenta de ${nombre}?`}
        descripcion="No podrá apartar puestos ni publicar viajes. La cuenta queda en la pestaña Rechazados."
        confirmar="Sí, rechazar"
        cancelar="No, volver"
        ocupado={pendiente}
        onConfirmar={() =>
          iniciar(async () => {
            await decidirCuenta(datos(id, "rechazar"))
            setAbierto(false)
          })
        }
      />
    </div>
  )
}
