import { Megaphone } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/nueva/ui/avatar"
import type { ChoferVista } from "@/lib/nueva/vistas"
import { cn } from "@/lib/utils"

// Piezas chicas de la interfaz nueva del pasajero (§5.21): textos y avatar, iguales en todas las pantallas

export const puestosLabel = (n: number) => (n <= 0 ? "Sin puestos" : n === 1 ? "1 puesto libre" : `${n} puestos libres`)
export const personasLabel = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)
export const carroLabel = (c: ChoferVista["carro"]) => (c ? [c.modelo, c.color].filter(Boolean).join(" ") || "Carro" : "Carro")

/** La foto del chofer o sus iniciales */
export function ChoferAvatar({ chofer, className }: { chofer: Pick<ChoferVista, "nombre" | "iniciales" | "fotoUrl">; className?: string }) {
  return (
    <Avatar className={cn("size-12", className)}>
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
