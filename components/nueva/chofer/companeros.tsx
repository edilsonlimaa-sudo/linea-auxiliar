import { ChevronRight } from "lucide-react"
import Link from "next/link"

import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import type { Companero } from "@/lib/datos/inicio-chofer"
import { iniciales } from "@/lib/viajes"

/** La franja de compañeros en Inicio (R7): sus caras y cuántos trabajan; lleva a la lista para coordinarse */
export function FranjaCompaneros({ companeros }: { companeros: Companero[] }) {
  const n = companeros.length
  if (n === 0) {
    return <p className="px-1 text-sm text-muted-foreground">Nadie más está trabajando ahora.</p>
  }
  const visibles = companeros.slice(0, 3)
  return (
    <Link
      href="/n/chofer/companeros"
      transitionTypes={["nav-forward"]}
      className="flex items-center gap-3 rounded-3xl border bg-card p-4 transition-colors active:bg-muted"
    >
      <div className="flex -space-x-3">
        {visibles.map((c) => (
          <ChoferAvatar key={c.id} chofer={{ nombre: c.nombre, iniciales: iniciales(c.nombre), fotoUrl: c.fotoUrl }} className="size-10 ring-2 ring-card" />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading font-semibold">{n === 1 ? `${companeros[0].nombre.split(" ")[0]} también trabaja` : `${n} compañeros trabajando`}</p>
        <p className="truncate text-sm text-muted-foreground">Qué hace cada uno y sus próximos viajes</p>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  )
}
