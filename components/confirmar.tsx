"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Confirmación de una acción que no se puede deshacer (en lugar de window.confirm).
 * En el celular sube desde abajo, como las demás hojas, con botones grandes que dicen qué pasa
 * ("Sí, ya no voy" / "No, sigo en el viaje") en vez de "Aceptar / Cancelar".
 * Base UI se encarga del foco, Esc y de anunciarlo como alertdialog.
 */
export function Confirmar({
  abierto,
  onCambiar,
  titulo,
  descripcion,
  confirmar,
  cancelar,
  onConfirmar,
  ocupado = false,
  error,
  variante = "destructive",
}: {
  abierto: boolean
  onCambiar: (abierto: boolean) => void
  titulo: string
  descripcion: React.ReactNode
  confirmar: string
  cancelar: string
  onConfirmar: () => void
  ocupado?: boolean
  error?: string
  variante?: "destructive" | "signal" // signal: confirmar algo que no es una pérdida (p. ej. salir con pasajeros)
}) {
  return (
    <AlertDialog.Root open={abierto} onOpenChange={(v) => !ocupado && onCambiar(v)}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/70 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup
          className={cn(
            "fixed z-50 flex flex-col gap-4 bg-popover p-6 text-popover-foreground shadow-lg outline-none transition duration-200",
            // Celular: hoja inferior. Pantalla grande: cuadro centrado.
            "inset-x-0 bottom-0 rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))] data-ending-style:translate-y-10 data-starting-style:translate-y-10 data-ending-style:opacity-0 data-starting-style:opacity-0",
            "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:data-ending-style:translate-y-[-45%] sm:data-starting-style:translate-y-[-45%]"
          )}
        >
          <div className="flex flex-col gap-2">
            <AlertDialog.Title className="text-base leading-tight font-bold">{titulo}</AlertDialog.Title>
            <AlertDialog.Description className="text-base text-muted-foreground">{descripcion}</AlertDialog.Description>
          </div>
          {error && (
            <p role="alert" className="font-bold text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-2.5">
            <Button variant={variante} size="lg" className="w-full" disabled={ocupado} onClick={onConfirmar}>
              {ocupado && <Loader2Icon aria-hidden className="animate-spin" />}
              {confirmar}
            </Button>
            {/* Cerrar es lo seguro: recibe el foco al abrir para que un toque o Enter por reflejo no confirme */}
            <AlertDialog.Close render={<Button variant="outline" size="lg" className="w-full" disabled={ocupado} autoFocus />}>
              {cancelar}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
