import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

/** Cinco estrellas fijas, llenas hasta `valor` */
export function Estrellas({ valor, className, tamano = "size-4" }: { valor: number; className?: string; tamano?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${valor.toFixed(1).replace(".", ",").replace(",0", "")} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={cn(tamano, n <= Math.round(valor) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </span>
  )
}

/** "4,5" */
export const promedio = (n: number) => n.toFixed(1).replace(".", ",")
