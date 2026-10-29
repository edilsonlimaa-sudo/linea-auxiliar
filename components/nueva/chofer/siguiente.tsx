import { Clock, Users } from "lucide-react"

import { puestosTexto } from "@/lib/nueva/textos"
import { OpcionesDrawer } from "@/components/nueva/chofer/viaje"
import { Badge } from "@/components/nueva/ui/badge"
import type { ViajeChofer } from "@/lib/datos/inicio-chofer"
import { SENTIDOS } from "@/lib/viajes"

/**
 * Un viaje de la cadena (R11), en su pestaña: ya publicado, con su hora (calculada en el servidor) y sus opciones.
 * `cadena`: empieza al salir del que recoge; si no, empieza al terminar el que va en ruta.
 */
export function TarjetaProximo({ viaje: v, texto, cadena }: { viaje: ViajeChofer; texto: string; cadena: boolean }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary">Siguiente viaje</Badge>
        {v.despues === "vuelta" ? <Badge variant="outline">Vuelta</Badge> : null}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{SENTIDOS[v.sentido].largo}</p>
        <h2 className="font-heading text-2xl font-semibold">{SENTIDOS[v.sentido].corto}</h2>
      </div>
      <p className="flex flex-col gap-1 text-sm">
        <span className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-primary" />
          {texto}
        </span>
        <span className="flex items-center gap-2">
          <Users className="size-4 shrink-0 text-primary" />
          {v.lista.length === 0 ? `${puestosTexto(v.puestos)}, nadie anotado` : `${Math.min(v.ocupados, v.puestos)} de ${puestosTexto(v.puestos)}`}
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        {cadena ? "Empieza solo cuando salgas del viaje que estás recogiendo." : "Los pasajeros ya te ven en camino."}
      </p>
      <OpcionesDrawer viajeId={v.id} puestos={v.puestos} ocupados={v.ocupados} enRuta={false} />
    </section>
  )
}
