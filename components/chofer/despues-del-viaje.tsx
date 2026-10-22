import { CoffeeIcon, FlagIcon, MegaphoneIcon } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { textoVuelta } from "@/lib/fechas"
import type { Viaje } from "@/lib/viajes"

// Abre "¿Qué haces después?" (PreguntarVuelta llega abierta por ?vuelta=1)
const PREGUNTAR = "/inicio?vuelta=1"

/**
 * R73: en ruta y sin otro viaje publicado. Sin respuesta, un aviso amarillo para responder; con pausa o último, lo que
 * avisó, con "Cambiar".
 */
export function DespuesDelViaje({ viaje }: { viaje: Pick<Viaje, "despues" | "despues_vuelve_en"> }) {
  if (viaje.despues === "pausa" || viaje.despues === "ultimo") {
    const Icono = viaje.despues === "pausa" ? CoffeeIcon : FlagIcon
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-muted px-3 py-2.5">
        <span className="flex flex-1 items-start gap-2">
          <Icono aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>
            <strong>Después:</strong>{" "}
            {viaje.despues === "pausa" ? `pausa, ${textoVuelta(viaje.despues_vuelve_en).replace("vuelve", "vuelves")}` : "es tu último viaje de hoy"}
          </span>
        </span>
        <Link href={PREGUNTAR} scroll={false} className="font-bold text-primary underline-offset-4 hover:underline">
          Cambiar
        </Link>
      </p>
    )
  }
  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl border-2 border-warning bg-warning-muted p-3">
      <p className="flex items-start gap-2">
        <MegaphoneIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
        <span>
          <strong>Avisa qué haces después:</strong> tus pasajeros lo ven. ¿Publicas tu vuelta, haces una pausa o es tu último viaje?
        </span>
      </p>
      <Link href={PREGUNTAR} scroll={false} className={buttonVariants({ className: "w-full" })}>
        Avisar qué hago después
      </Link>
    </div>
  )
}
