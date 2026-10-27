"use client"

import { Loader2 } from "lucide-react"

import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/nueva/ui/drawer"
import { cn } from "@/lib/utils"

// Piezas comunes de la interfaz nueva del chofer (§5.21). Las reglas son las de la clásica (components/chofer):
// aquí cambia solo cómo se ve.

/** Una opción grande para tocar (radio nativo oculto: teclado y lector de pantalla funcionan) */
export function Opcion({
  nombre,
  elegida,
  onElegir,
  children,
  className,
}: {
  nombre: string
  elegida: boolean
  onElegir: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-center font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        elegida ? "border-primary bg-primary text-primary-foreground" : "bg-card active:bg-muted",
        className
      )}
    >
      <input type="radio" name={nombre} checked={elegida} onChange={onElegir} className="sr-only" />
      {children}
    </label>
  )
}

/** El error de una acción, debajo de su botón */
export function ErrorAccion({ error, className }: { error?: string; className?: string }) {
  if (!error) return null
  return (
    <p role="alert" className={cn("text-sm text-destructive", className)}>
      {error}
    </p>
  )
}

export const personasTexto = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)
export const puestosTexto = (n: number) => (n === 1 ? "1 puesto" : `${n} puestos`)

/**
 * Confirmar una acción que no se deshace (como components/confirmar.tsx de la clásica), en hoja: botones que dicen qué
 * pasa y la opción segura abajo.
 */
export function ConfirmarDrawer({
  abierto,
  onCambiar,
  titulo,
  descripcion,
  confirmar,
  cancelar = "Volver",
  variante = "destructive",
  ocupado = false,
  error,
  onConfirmar,
  children,
}: {
  abierto: boolean
  onCambiar: (abierto: boolean) => void
  titulo: string
  descripcion?: React.ReactNode
  confirmar: string
  cancelar?: string
  variante?: "destructive" | "default"
  ocupado?: boolean
  error?: string
  onConfirmar: () => void
  children?: React.ReactNode
}) {
  return (
    <Drawer open={abierto} onOpenChange={(v) => !ocupado && onCambiar(v)} showSwipeHandle>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          <DrawerTitle className="font-heading text-xl">{titulo}</DrawerTitle>
          {descripcion ? <DrawerDescription render={<div />}>{descripcion}</DrawerDescription> : null}
        </DrawerHeader>
        {children}
        <DrawerFooter>
          <ErrorAccion error={error} />
          <Button size="lg" variant={variante} disabled={ocupado} onClick={onConfirmar}>
            {ocupado ? <Loader2 className="animate-spin" /> : null}
            {confirmar}
          </Button>
          <Button size="lg" variant="ghost" disabled={ocupado} onClick={() => onCambiar(false)}>
            {cancelar}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
