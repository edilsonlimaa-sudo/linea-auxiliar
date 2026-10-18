"use client"

import { Loader2Icon, PowerIcon } from "lucide-react"
import { useState } from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { Confirmar } from "@/components/confirmar"
import { Button } from "@/components/ui/button"
import { conectarme, desconectarme } from "@/lib/acciones/chofer"
import { cn } from "@/lib/utils"

/** "Conectado / Desconectado" (R6–R8). Desconectarse con viajes publicados los cancela: pide confirmación. */
export function Conexion({ conectado, viajesAbiertos }: { conectado: boolean; viajesAbiertos: number }) {
  const { ejecutar, pendiente, error } = useAccion()
  const [confirmar, setConfirmar] = useState(false)

  const desconectar = () => ejecutar(desconectarme, () => setConfirmar(false))

  return (
    <div className="flex flex-col gap-2">
      <div className={cn("flex items-center gap-3 rounded-2xl border-2 px-4 py-2", conectado ? "border-success/40 bg-success-muted" : "bg-muted")}>
        <span aria-hidden className={cn("size-3 shrink-0 rounded-full", conectado ? "bg-success" : "bg-muted-foreground")} />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{conectado ? "Conectado" : "Desconectado"}</p>
          {/* Conectado no necesita explicación; desconectado sí: es la razón de que nadie lo vea */}
          {!conectado && <p className="text-[15px] text-muted-foreground">Los pasajeros no te ven. Publicar un viaje te conecta.</p>}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={pendiente}
          onClick={() => (conectado ? (viajesAbiertos > 0 ? setConfirmar(true) : desconectar()) : ejecutar(conectarme))}
        >
          {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <PowerIcon aria-hidden />}
          {conectado ? "Desconectarme" : "Conectarme"}
        </Button>
      </div>
      {error && !confirmar && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      <Confirmar
        abierto={confirmar}
        onCambiar={setConfirmar}
        titulo="¿Desconectarte?"
        descripcion={
          viajesAbiertos === 1
            ? "Se cancela el viaje que publicaste y tus pasajeros tendrán que escoger otra unidad."
            : `Se cancelan los ${viajesAbiertos} viajes que publicaste y tus pasajeros tendrán que escoger otra unidad.`
        }
        confirmar="Sí, desconectarme"
        cancelar="No, sigo trabajando"
        onConfirmar={desconectar}
        ocupado={pendiente}
        error={error}
      />
    </div>
  )
}
