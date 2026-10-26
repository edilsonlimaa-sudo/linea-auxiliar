import { SmartphoneIcon } from "lucide-react"
import Link from "next/link"

import { Avatar } from "@/components/foto/avatar"
import type { EnLaNueva } from "@/lib/datos/interfaz"

/** Quiénes ya usan la interfaz nueva (R83), arriba de la lista de Pasajeros; cada nombre lleva a su detalle */
export function EnLaNuevaFranja({ personas, base }: { personas: EnLaNueva[]; base: "/admin/pasajeros" | "/admin/choferes" }) {
  return (
    <section aria-labelledby="titulo-en-la-nueva" className="flex flex-col gap-2 rounded-2xl border-2 bg-card px-4 py-3">
      <h2 id="titulo-en-la-nueva" className="flex items-center gap-2 font-bold">
        <SmartphoneIcon aria-hidden className="size-5 text-primary" />
        En la interfaz nueva: {personas.length}
      </h2>
      {personas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nadie todavía. Ábrele el detalle a alguien y toca “Pasar a la nueva”.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {personas.map((p) => (
            <li key={p.id}>
              <Link href={`${base}/${p.id}`} className="flex items-center gap-2 rounded-full border-2 py-1 pr-3 pl-1 text-sm font-bold hover:bg-muted">
                <Avatar url={p.fotoUrl} nombre={p.nombre} className="size-7 text-xs" />
                {p.nombre}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
