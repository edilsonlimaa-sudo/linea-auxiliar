import { CirclePlus, Clock, Users } from "lucide-react"
import Link from "next/link"

import { puestosTexto } from "@/lib/nueva/textos"
import { OpcionesDrawer } from "@/components/nueva/chofer/viaje"
import { Badge } from "@/components/nueva/ui/badge"
import type { ViajeChofer } from "@/lib/datos/inicio-chofer"
import { SENTIDOS } from "@/lib/viajes"

/**
 * La cadena (R11): los próximos viajes ya publicados, con su hora (calculada en el servidor) y sus opciones, y debajo
 * "Agregar otro viaje". `modo`: cadena (con una recogida en curso) o desde_ruta (solo va en ruta: empieza ya).
 */
export function Proximos({
  proximos,
  textos,
  modo,
  puedeAgregar = true,
}: {
  proximos: ViajeChofer[]
  textos: Record<string, string> // el "Próximo: recoges … a las …" de cada uno
  modo: "cadena" | "desde_ruta"
  puedeAgregar?: boolean // sin la cuota del día no se publica (R76)
}) {
  return (
    <section className="flex flex-col gap-3">
      {proximos.map((v) => (
        <div key={v.id} className="flex flex-col gap-2 rounded-3xl border bg-card p-4">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Siguiente viaje
            {v.despues === "vuelta" ? <Badge variant="secondary">Vuelta</Badge> : null}
          </p>
          <p className="font-heading text-lg font-semibold">{SENTIDOS[v.sentido].corto}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {v.lista.length === 0 ? `${puestosTexto(v.puestos)}, nadie anotado` : `${Math.min(v.ocupados, v.puestos)} de ${puestosTexto(v.puestos)}`}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {textos[v.id]}
            </span>
          </p>
          <OpcionesDrawer viajeId={v.id} puestos={v.puestos} ocupados={v.ocupados} enRuta={false} />
        </div>
      ))}
      {puedeAgregar ? (
        <Link
          href={`/n/chofer/publicar?modo=${modo}`}
          transitionTypes={["nav-forward"]}
          className="flex items-center gap-3 rounded-3xl border border-dashed p-4 text-sm text-muted-foreground transition-colors active:bg-muted"
        >
          <CirclePlus className="size-5 shrink-0 text-primary" />
          <span>
            <span className="block font-medium text-foreground">{proximos.length > 0 ? "Agregar otro viaje" : "Dejar el siguiente viaje publicado"}</span>
            {modo === "cadena" ? "Empieza solo cuando salgas del actual." : "Empieza ya: los pasajeros te ven en camino."}
          </span>
        </Link>
      ) : null}
    </section>
  )
}
