"use client"

import { UsersIcon } from "lucide-react"
import { useCallback, useSyncExternalStore } from "react"

import { BotonTerminar } from "@/components/chofer/boton-terminar"
import { FilaPasajero } from "@/components/chofer/fila-pasajero"
import { FilaLista } from "@/components/chofer/lista-tramo"
import { MasOpciones } from "@/components/chofer/mas-opciones"
import { OcuparPuesto } from "@/components/chofer/ocupar-puesto"
import type { EntradaTramo, ViajeChofer } from "@/lib/datos/inicio-chofer"
import { hora } from "@/lib/fechas"
import { contrario, duracion, libres, SENTIDOS, sumaPersonas } from "@/lib/viajes"

/**
 * El viaje en ruta, arriba y siempre abierto (R75): una tarjeta azul ("En ruta hacia …", "Salió 9:01 · hace 18 min",
 * "4 a bordo · 0 libres") con Subió alguien a mano y, pegado debajo, una línea por persona con su acción (primero lo que
 * no puede esperar: pedidos y a quien recoger en el camino) y las acciones del viaje (Opciones · Terminar).
 */
export function EnRutaCompacto({
  viaje,
  esperanEnCamino = [],
  sinVuelta,
  faltaDespues,
}: {
  viaje: ViajeChofer
  esperanEnCamino?: EntradaTramo[] // R67: hacia Valle Grande, anotados en el camino sin carro que caben
  sinVuelta: boolean // sin otro viaje publicado
  faltaDespues: boolean // sin decir qué hace después (R73)
}) {
  // "hace N min": con la hora del celular (en el servidor no se muestra)
  const suscribirReloj = useCallback((avisar: () => void) => {
    const id = setInterval(avisar, 30_000)
    return () => clearInterval(id)
  }, [])
  const ahora = useSyncExternalStore(suscribirReloj, () => Math.floor(Date.now() / 30_000) * 30_000, () => 0)
  const salio = viaje.salida_en ?? viaje.estado_en

  const pedidos = viaje.lista.filter((f) => f.pendiente)
  const porRecoger = viaje.lista.filter((f) => f.estado === "activa" && !f.pendiente)
  const aBordo = viaje.lista.filter((f) => f.estado === "subio")
  const personasABordo = sumaPersonas(aBordo)

  return (
    <section aria-label={`Tu viaje en ruta ${SENTIDOS[viaje.sentido].hacia}`} className="flex flex-col">
      <div className="flex flex-col gap-3 rounded-t-2xl bg-primary p-4 text-primary-foreground shadow-md">
        <p className="leading-tight">
          <span className="block text-lg font-bold">En ruta {SENTIDOS[viaje.sentido].hacia}</span>
          <span className="mt-0.5 block text-sm opacity-90">
            {/* La hora y "hace N min", solo en el navegador: el formato de la hora del servidor no es igual al del celular */}
            {ahora > 0 && (
              <>
                <span className="whitespace-nowrap">Salió {hora(salio)}</span> ·{" "}
                <span className="whitespace-nowrap">hace {duracion(Math.max(0, (ahora - new Date(salio).getTime()) / 60_000))}</span>
              </>
            )}
          </span>
        </p>

        {/* Cuántos van y cuántos caben: lo que más mira en ruta */}
        <p className="flex items-center gap-2 text-base font-bold">
          <UsersIcon aria-hidden className="size-5 shrink-0" />
          {personasABordo === 1 ? "1 a bordo" : `${personasABordo} a bordo`}
          <span className="font-normal opacity-90">· {libres(viaje) === 1 ? "1 libre" : `${libres(viaje)} libres`}</span>
        </p>

        {/* Lo que más usa en ruta, siempre a mano: subir a quien recoge en el camino (R36) */}
        {libres(viaje) > 0 ? (
          <OcuparPuesto viajeId={viaje.id} enRuta claro />
        ) : (
          <p className="rounded-xl bg-primary-foreground/10 px-3 py-2 text-center text-sm font-bold">Carro lleno</p>
        )}
      </div>

      <div className="flex flex-col gap-1 rounded-b-2xl border-2 border-t-0 border-primary bg-card px-3 pt-1 pb-3">
        {/* Primero lo que no puede esperar: pedidos en el camino (R29) y a quien recoger en el camino */}
        <ul className="flex flex-col">
          {[...pedidos, ...porRecoger].map((f) => (
            <FilaPasajero key={f.id} fila={f} estadoViaje={viaje.estado} compacta />
          ))}
        </ul>
        {/* R67: anotados en el camino después de salir de Gina; "Voy" los liga a este carro */}
        {esperanEnCamino.length > 0 && (
          <section className="my-1 flex flex-col gap-2 rounded-xl bg-warning-muted p-2">
            <h3 className="text-sm font-bold">Espera en el camino ({esperanEnCamino.length}): toca Voy si pasas por ahí</h3>
            <ol className="flex flex-col gap-2">
              {esperanEnCamino.map((e) => (
                <FilaLista key={e.id} entrada={e} viajeId={viaje.id} puedeIr puedeSubir conNoEstaba compacta />
              ))}
            </ol>
          </section>
        )}
        {aBordo.length > 0 ? (
          <ul className="flex flex-col">
            {aBordo.map((f) => (
              <FilaPasajero key={f.id} fila={f} estadoViaje={viaje.estado} compacta />
            ))}
          </ul>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">Nadie a bordo.</p>
        )}
        <div className="mt-1 flex gap-2 *:min-w-0 *:flex-1">
          <MasOpciones viajeId={viaje.id} puestos={viaje.puestos} ocupados={viaje.ocupados} enRuta />
          <BotonTerminar
            viajeId={viaje.id}
            salioEn={salio}
            destino={SENTIDOS[contrario(viaje.sentido)].enRecogida}
            sinVuelta={sinVuelta}
            faltaDespues={faltaDespues}
            variante="outline"
            texto="Terminar"
          />
        </div>
      </div>
    </section>
  )
}
