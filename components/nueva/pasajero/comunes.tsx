import { Megaphone } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/nueva/ui/avatar"
import type { ChoferVista } from "@/lib/nueva/vistas"
import { cn } from "@/lib/utils"

// Piezas chicas de la interfaz nueva del pasajero (§5.21): textos y avatar, iguales en todas las pantallas

export const puestosLabel = (n: number) => (n <= 0 ? "Sin puestos" : n === 1 ? "1 puesto libre" : `${n} puestos libres`)
export const personasLabel = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)
export const carroLabel = (c: ChoferVista["carro"]) => (c ? [c.modelo, c.color].filter(Boolean).join(" ") || "Carro" : "Carro")

/** "2 libres" / "Lleno": el texto que va junto a las casillas */
export const libresLabel = (n: number) => (n <= 0 ? "Lleno" : n === 1 ? "1 libre" : `${n} libres`)

/**
 * Los puestos como casillas, como en la clásica (§5.21): llenas las ocupadas, vacías con borde verde las libres.
 * Solo es un dibujo: el texto de al lado dice lo mismo.
 */
export function Asientos({ puestos, libres, chicas = false }: { puestos: number; libres: number; chicas?: boolean }) {
  const ocupados = Math.max(0, puestos - Math.max(0, libres))
  return (
    <span aria-hidden className={cn("flex shrink-0", chicas ? "gap-[3px]" : "gap-1")}>
      {Array.from({ length: puestos }, (_, i) => (
        <span
          key={i}
          className={cn(
            chicas ? "h-3.5 w-2.5 rounded-[4px]" : "h-5 w-4 rounded-md",
            i < ocupados ? "bg-primary" : "border-[1.5px] border-success bg-success/10"
          )}
        />
      ))}
    </span>
  )
}

/** La foto del chofer o sus iniciales */
export function ChoferAvatar({ chofer, className }: { chofer: Pick<ChoferVista, "nombre" | "iniciales" | "fotoUrl">; className?: string }) {
  return (
    <Avatar data-chofer-avatar className={cn("size-12", className)}>
      {chofer.fotoUrl ? <AvatarImage src={chofer.fotoUrl} alt={`Foto de ${chofer.nombre}`} /> : null}
      <AvatarFallback className="bg-primary/10 font-heading font-semibold text-primary">{chofer.iniciales}</AvatarFallback>
    </Avatar>
  )
}

/** El aviso del día de la línea (R47) */
export function AvisoCard({ texto }: { texto: string }) {
  return (
    <div className="flex gap-3 rounded-3xl bg-secondary p-4 text-secondary-foreground">
      <Megaphone className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="font-medium">Aviso de la línea</p>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </div>
    </div>
  )
}
