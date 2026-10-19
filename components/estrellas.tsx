import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** ★★★★☆ con el texto para lectores de pantalla ("4 de 5 estrellas") */
export function Estrellas({ valor, tamano = "size-5", className }: { valor: number; tamano?: string; className?: string }) {
  const llenas = Math.round(valor)
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <span className="sr-only">{valor.toFixed(1).replace(".", ",").replace(",0", "")} de 5 estrellas</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} aria-hidden className={cn(tamano, n <= llenas ? "fill-signal text-signal" : "text-muted-foreground/40")} />
      ))}
    </span>
  )
}

/** "4,5" */
export const promedioTexto = (n: number) => n.toFixed(1).replace(".", ",")
