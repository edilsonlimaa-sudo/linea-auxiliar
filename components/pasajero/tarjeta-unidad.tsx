import { ClockIcon } from "lucide-react"

import { Asientos } from "@/components/pasajero/asientos"
import { ChoferResumen } from "@/components/pasajero/chofer-resumen"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { BotonApartar } from "@/components/pasajero/boton-apartar"
import type { ViajeConChofer } from "@/lib/datos/inicio-pasajero"
import type { Punto } from "@/lib/mapa"
import { cn } from "@/lib/utils"
import { ETIQUETA_ESTADO, enEspera, libres, llegada, SENTIDOS, type Viaje } from "@/lib/viajes"

/**
 * Una unidad que el pasajero puede escoger (R16). Jerarquía: cuándo llega → si hay puesto → quién maneja → acción.
 * Al apartar sube la hoja "¿Dónde te recogemos?" (R27).
 */
export function TarjetaUnidad({
  viaje,
  porId,
  reservaAnterior,
  yo = null,
  recientes = [],
  lugarInicial,
}: {
  viaje: ViajeConChofer
  porId: Map<string, Viaje>
  reservaAnterior?: string | null
  yo?: Punto | null // GPS del pasajero (de su espera), para la distancia en el mapa
  recientes?: string[] // lugares recientes para la hoja de lugar (R25)
  lugarInicial?: string | null // el de su espera, si estaba esperando (R27)
}) {
  const cuando = llegada(viaje, porId)
  const hayPuesto = libres(viaje) > 0
  const enRuta = viaje.estado === "en_ruta"
  const espera = enEspera(viaje)
  const recogiendo = viaje.estado === "en_parada" || viaje.estado === "llegando"

  const textoBoton = enRuta ? "Pedir que me recoja en el camino" : hayPuesto ? "Apartar puesto" : "Anotarme en la lista de espera"

  return (
    <article className="flex flex-col gap-4 rounded-3xl border-2 bg-card p-4 text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* La ruta siempre a la vista: nadie debe adivinar adónde va el carro */}
          <p className="mb-1 text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[viaje.sentido].largo}</p>
          <p className={cn("text-xl leading-tight font-bold", recogiendo && "text-success")}>{cuando.principal}</p>
          {cuando.detalle && <p className="mt-0.5 text-[15px] text-muted-foreground">{cuando.detalle}</p>}
        </div>
        {/* El título ya dice el estado ("Recoge en Valle Grande en…"); la etiqueta solo aporta en el próximo viaje */}
        {viaje.estado === "programado" && (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-sm font-bold text-muted-foreground">
            <ClockIcon aria-hidden className="mr-1 inline size-4 align-[-3px]" />
            {ETIQUETA_ESTADO.programado}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Asientos puestos={viaje.puestos} ocupados={Math.min(viaje.ocupados, viaje.puestos)} />
        <p className="font-bold">
          {hayPuesto ? (
            <span className="text-success">
              {libres(viaje) === 1 ? "Queda 1 puesto" : `Quedan ${libres(viaje)} puestos`}
            </span>
          ) : (
            <span>Lleno{espera > 0 && <span className="font-normal text-muted-foreground"> · {espera} en lista de espera</span>}</span>
          )}
        </p>
      </div>

      <ChoferResumen chofer={viaje.chofer} />

      <div className="flex flex-col gap-2">
        <BotonApartar
          viajeId={viaje.id}
          texto={textoBoton}
          variante={hayPuesto ? "default" : "outline"}
          reservaAnterior={reservaAnterior}
          recientes={recientes}
          lugarInicial={lugarInicial}
        />
        <VerEnMapa choferId={viaje.chofer_id} chofer={viaje.chofer.nombre} yo={yo} />
      </div>
      {enRuta && <p className="-mt-2 text-[15px] text-muted-foreground">Ya salió. El chofer te confirma si puede pasar por ti.</p>}
      {!hayPuesto && !enRuta && (
        <p className="-mt-2 text-[15px] text-muted-foreground">Si alguien libera su puesto, subes solo por orden de llegada.</p>
      )}
    </article>
  )
}
