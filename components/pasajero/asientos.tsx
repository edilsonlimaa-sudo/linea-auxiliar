import { cn } from "@/lib/utils"

/** Puestos como casillas (llenas = ocupadas). Ayuda a entender de un vistazo; el texto dice lo mismo. */
export function Asientos({ puestos, ocupados }: { puestos: number; ocupados: number }) {
  return (
    <span aria-hidden className="flex gap-1">
      {Array.from({ length: puestos }, (_, i) => (
        <span
          key={i}
          className={cn("h-5 w-4 rounded-[5px] border-2", i < ocupados ? "border-primary bg-primary" : "border-success bg-success-muted")}
        />
      ))}
    </span>
  )
}
