import { ChevronDownIcon, ClockIcon, StarIcon } from "lucide-react"

import { promedioTexto } from "@/components/estrellas"
import { Asientos } from "@/components/pasajero/asientos"
import { BotonApartar } from "@/components/pasajero/boton-apartar"
import { ChoferResumen } from "@/components/pasajero/chofer-resumen"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import type { ViajeConChofer } from "@/lib/datos/inicio-pasajero"
import type { Punto } from "@/lib/mapa"
import { cn } from "@/lib/utils"
import { cabe, ETIQUETA_ESTADO, enEspera, libres, llegada, nombreCorto, SENTIDOS, type Viaje } from "@/lib/viajes"

/**
 * Una unidad que el pasajero puede escoger (R16), corta para comparar varias (§8): cuándo recoge → si hay puesto →
 * quién maneja → Apartar y el mapa. Foto, carro y aire, al abrir "Ver chofer y carro". Al apartar sube la hoja
 * "¿Dónde te recogemos?" (R27).
 */
export function TarjetaUnidad({
  viaje,
  porId,
  reservaAnterior,
  yo = null,
  recientes = [],
  lugarInicial,
  personas = 1,
}: {
  viaje: ViajeConChofer
  porId: Map<string, Viaje>
  reservaAnterior?: string | null
  yo?: Punto | null // GPS del pasajero (de su espera), para la distancia en el mapa
  recientes?: string[] // lugares recientes para la hoja de lugar (R25)
  lugarInicial?: string | null // el de su espera, si estaba esperando (R27)
  personas?: number // cuántos van, si ya lo dijo al esperar (R57); si no, se pregunta al apartar
}) {
  const cuando = llegada(viaje, porId)
  const hayPuesto = libres(viaje) > 0
  const caben = cabe(viaje, personas) // el grupo viaja junto: puestos para todos (R57)
  const enRuta = viaje.estado === "en_ruta"
  const espera = enEspera(viaje)
  const recogiendo = viaje.estado === "en_parada" || viaje.estado === "llegando"
  const { chofer } = viaje

  // ¿Cuántos van? se pregunta al apartar, hasta los puestos libres (máx. 4). Lleno: lista de espera, de a uno (R57)
  const puedeApartar = hayPuesto || !enRuta
  const maxPersonas = hayPuesto ? Math.min(libres(viaje), 4) : 1
  const textoBoton = enRuta ? "Pedir que me recoja" : hayPuesto ? "Apartar puesto" : "Anotarme en la lista de espera"

  return (
    <article className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4 text-card-foreground shadow-xs">
      {/* 1. Cuándo recoge: es lo que decide primero */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* La ruta siempre a la vista (R39): nadie debe adivinar adónde va el carro */}
          <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[viaje.sentido].largo}</p>
          <p className={cn("text-xl leading-tight font-bold", recogiendo && "text-success")}>{cuando.principal}</p>
          {cuando.detalle && <p className="text-[15px] text-muted-foreground">{cuando.detalle}</p>}
        </div>
        {viaje.estado === "programado" && (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-sm font-bold text-muted-foreground">
            <ClockIcon aria-hidden className="mr-1 inline size-4 align-[-3px]" />
            {ETIQUETA_ESTADO.programado}
          </span>
        )}
      </div>

      {/* 2. ¿Hay puesto? 3. ¿Quién maneja? */}
      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-bold">
          <Asientos puestos={viaje.puestos} ocupados={Math.min(viaje.ocupados, viaje.puestos)} />
          {hayPuesto && !caben ? (
            <span className="text-warning">
              {libres(viaje) === 1 ? "Solo queda 1 puesto" : `Solo quedan ${libres(viaje)} puestos`} para {personas}
            </span>
          ) : hayPuesto ? (
            <span className="text-success">{libres(viaje) === 1 ? "Queda 1 puesto" : `Quedan ${libres(viaje)} puestos`}</span>
          ) : (
            <span>
              Lleno{espera > 0 && <span className="font-normal text-muted-foreground"> · {espera} en lista de espera</span>}
            </span>
          )}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-[15px]">
          <span className="font-bold">{nombreCorto(chofer.nombre)}</span>
          {chofer.estrellas !== null && (
            <span className="inline-flex items-center gap-0.5">
              <StarIcon aria-hidden className="size-4 fill-signal text-signal" />
              {promedioTexto(chofer.estrellas)}
              <span className="sr-only"> estrellas</span>
            </span>
          )}
          {chofer.vehiculo?.placa && <span className="font-mono font-bold tracking-wider text-muted-foreground">{chofer.vehiculo.placa}</span>}
        </p>
      </div>

      {/* 4. La acción, con el mapa al lado */}
      <div className="flex items-start gap-2">
        {puedeApartar ? (
          <BotonApartar
            viajeId={viaje.id}
            texto={textoBoton}
            variante={hayPuesto ? "default" : "outline"}
            reservaAnterior={reservaAnterior}
            recientes={recientes}
            lugarInicial={lugarInicial}
            personas={Math.min(personas, maxPersonas)}
            maxPersonas={maxPersonas}
            className="min-w-0 flex-1"
          />
        ) : (
          <p className="min-h-13 flex-1 rounded-2xl bg-muted px-4 py-3 text-[15px] font-bold text-muted-foreground">
            Ya va lleno
          </p>
        )}
        <VerEnMapa choferId={viaje.chofer_id} chofer={chofer.nombre} yo={yo} compacto />
      </div>
      {enRuta && <p className="text-[15px] text-muted-foreground">Ya salió. El chofer te confirma si puede pasar por ti.</p>}
      {!hayPuesto && puedeApartar && <p className="text-[15px] text-muted-foreground">Si alguien libera su puesto, subes por orden de llegada.</p>}

      {/* Lo demás, a pedido */}
      <details className="group -mx-1 rounded-2xl">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-xl px-1 font-bold text-primary focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          Ver chofer y carro
          <ChevronDownIcon aria-hidden className="size-5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-1 pt-2">
          <ChoferResumen chofer={chofer} />
        </div>
      </details>
    </article>
  )
}
