import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { ChoferEnPausa } from "@/lib/datos/inicio-pasajero"
import { textoVuelta } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { iniciales } from "@/lib/viajes"

/**
 * Choferes desconectados que dijeron si vuelven (R60): "José Pérez vuelve como a las 5:30 p. m." · "Ana vuelve más tarde" (sin
 * hora) · "Luisa terminó por hoy". Discreto: es una estimación, no una unidad para apartar.
 */
export function QuienVuelve({ choferes, className }: { choferes: ChoferEnPausa[]; className?: string }) {
  if (choferes.length === 0) return null
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {choferes.map((c) => (
        <li key={c.id} className="flex items-center gap-3 text-left">
          <Avatar className={cn("size-9", !c.vuelveEn && !c.sinHora && "opacity-60")}>
            {c.fotoUrl && <AvatarImage src={c.fotoUrl} alt="" />}
            <AvatarFallback className="bg-secondary text-sm font-bold text-secondary-foreground">{iniciales(c.nombre)}</AvatarFallback>
          </Avatar>
          <p className={cn("min-w-0 flex-1 leading-snug", !c.vuelveEn && !c.sinHora && "text-muted-foreground")}>
            <span className="font-bold">{c.nombre}</span> {textoVuelta(c.vuelveEn, undefined, c.sinHora)}
          </p>
        </li>
      ))}
    </ul>
  )
}
