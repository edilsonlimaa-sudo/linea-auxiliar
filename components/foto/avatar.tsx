import { cn } from "@/lib/utils"
import { iniciales } from "@/lib/viajes"

/** Foto de perfil redonda (R54) o, si no hay, las iniciales. `className` da el tamaño (p. ej. "size-12 text-lg"). */
export function Avatar({ url, nombre, className }: { url?: string | null; nombre: string; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- enlace firmado de Supabase Storage, ya liviano (R54)
    return <img src={url} alt={`Foto de ${nombre}`} className={cn("shrink-0 rounded-full bg-muted object-cover", className)} />
  }
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-secondary font-bold text-secondary-foreground", className)}>
      {iniciales(nombre)}
    </span>
  )
}
