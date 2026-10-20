import { ChevronDownIcon } from "lucide-react"

import { BarraAccion } from "@/components/chofer/barra-accion"
import { FilaPasajero } from "@/components/chofer/fila-pasajero"
import { MasOpciones } from "@/components/chofer/mas-opciones"
import { OcuparPuesto } from "@/components/chofer/ocupar-puesto"
import { Asientos } from "@/components/pasajero/asientos"
import type {
  FilaChofer,
  ViajeChofer as Viaje,
} from "@/lib/datos/inicio-chofer"
import { cn } from "@/lib/utils"
import {
  conAcompanantes,
  enEspera,
  estadoParaChofer,
  libres,
  SENTIDOS,
  type Viaje as ViajeBase,
} from "@/lib/viajes"

function Seccion({
  titulo,
  filas,
  estado,
  vacio,
}: {
  titulo: string
  filas: FilaChofer[]
  estado: Viaje["estado"]
  vacio?: string
}) {
  if (filas.length === 0 && !vacio) return null
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-bold">
        {titulo}{" "}
        <span className="font-normal text-muted-foreground">
          ({filas.length})
        </span>
      </h3>
      {filas.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed px-4 py-5 text-center text-muted-foreground">
          {vacio}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {filas.map((f) => (
            <FilaPasajero key={f.id} fila={f} estadoViaje={estado} />
          ))}
        </ol>
      )}
    </section>
  )
}

/** Mensaje listo para el grupo de WhatsApp al avisar llegada (R15) */
function mensajeGrupo(
  v: Viaje,
  vehiculo: { unidad: string | null; placa: string } | null
) {
  const confirmados = v.lista.filter((f) => f.confirmado)
  const carro = vehiculo
    ? ` · ${vehiculo.unidad ? `Unidad ${vehiculo.unidad} · ` : ""}${vehiculo.placa}`
    : ""
  const lineas = confirmados.map(
    (f) => `${f.personas > 1 ? `${f.desde}–${f.hasta}` : f.desde}. ${conAcompanantes(f.nombre, f.personas)}${f.lugar ? ` (${f.lugar})` : ""}`
  )
  return [
    `🚐 Llego en 3 minutos a recoger ${SENTIDOS[v.sentido].enRecogida}${carro}.`,
    confirmados.length === 0
      ? "Hay puestos libres."
      : `Suben los puestos 1 al ${confirmados.at(-1)?.hasta ?? confirmados.length}:`,
    ...lineas,
  ].join("\n")
}

/**
 * Un viaje del chofer: qué está haciendo, cuántos puestos, la lista en el orden justo y su acción principal.
 * `barraFija`: la acción va pegada abajo (solo el viaje "en foco"); si no, va dentro de la tarjeta.
 * `plegado`: próximos viajes (§8): se ve el resumen y al abrir, la lista y las opciones.
 */
export function ViajeChofer({
  viaje,
  porId,
  vehiculo,
  barraFija = false,
  plegado = false,
}: {
  viaje: Viaje
  porId: Map<string, ViajeBase>
  vehiculo: { unidad: string | null; placa: string } | null
  barraFija?: boolean
  plegado?: boolean
}) {
  const { titulo, detalle } = estadoParaChofer(viaje, porId)
  const enRuta = viaje.estado === "en_ruta"
  // Las solicitudes sin responder van aparte, arriba (R58)
  const solicitudes = viaje.lista.filter((f) => f.pendiente)
  const conPuesto = viaje.lista.filter((f) => f.confirmado && !f.pendiente)
  const enLista = viaje.lista.filter((f) => !f.confirmado && !f.pendiente)
  const sinLlegar = conPuesto
    .filter((f) => f.conApp && !f.listo)
    .map((f) => f.nombre)
  const espera = enEspera(viaje)

  const barra = (
    <BarraAccion
      viajeId={viaje.id}
      estado={viaje.estado}
      confirmados={conPuesto.length}
      sinLlegar={sinLlegar}
      mensajeGrupo={mensajeGrupo(viaje, vehiculo)}
      fija={barraFija}
    />
  )

  const anotados = viaje.lista.length
  if (plegado) {
    return (
      <details className="group rounded-3xl border-2 bg-card text-card-foreground">
        <summary className="flex cursor-pointer list-none items-start gap-3 rounded-3xl p-4 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold tracking-wide text-muted-foreground uppercase">
              {SENTIDOS[viaje.sentido].largo}
            </span>
            <span className="block text-lg leading-tight font-bold">
              {titulo}
            </span>
            <span className="block text-[15px] text-muted-foreground">
              {anotados === 0
                ? "Nadie anotado"
                : anotados === 1
                  ? "1 anotado"
                  : `${anotados} anotados`}{" "}
              de {viaje.puestos} puestos
            </span>
          </span>
          <ChevronDownIcon
            aria-hidden
            className="mt-6 size-6 shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="flex flex-col gap-5 px-4 pb-4">
          <p className="text-muted-foreground">{detalle}</p>
          {cuerpo()}
        </div>
      </details>
    )
  }

  return (
    <>
      <section
        aria-labelledby={`viaje-${viaje.id}`}
        className="flex flex-col gap-5 rounded-3xl border-2 border-primary bg-card p-4 text-card-foreground shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
            {SENTIDOS[viaje.sentido].largo}
          </p>
          <h2
            id={`viaje-${viaje.id}`}
            className={cn(
              "text-2xl leading-tight font-bold",
              viaje.estado === "en_parada" && "text-success"
            )}
          >
            {titulo}
          </h2>
          <p className="text-muted-foreground">{detalle}</p>
        </div>
        {cuerpo()}
        {!barraFija && barra}
      </section>
      {barraFija && barra}
    </>
  )

  // Puestos, lista y opciones: igual en la tarjeta abierta y en la plegada
  function cuerpo() {
    return (
      <>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Asientos
            puestos={viaje.puestos}
            ocupados={Math.min(viaje.ocupados, viaje.puestos)}
          />
          <p className="font-bold">
            {Math.min(viaje.ocupados, viaje.puestos)} de {viaje.puestos} puestos
            {libres(viaje) > 0 && !enRuta && (
              <span className="text-success"> · {libres(viaje)} libres</span>
            )}
            {espera > 0 && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {espera} en espera
              </span>
            )}
          </p>
        </div>

        {enRuta ? (
          <>
            <Seccion
              titulo="Piden que pases por ellos"
              filas={viaje.lista.filter((f) => f.pendiente)}
              estado={viaje.estado}
            />
            <Seccion
              titulo="Vas a recoger"
              filas={viaje.lista.filter(
                (f) => f.estado === "activa" && !f.pendiente
              )}
              estado={viaje.estado}
            />
            <Seccion
              titulo="A bordo"
              filas={viaje.lista.filter((f) => f.estado === "subio")}
              estado={viaje.estado}
              vacio="Nadie a bordo"
            />
          </>
        ) : (
          <>
            <Seccion titulo="Piden puesto: confírmalos" filas={solicitudes} estado={viaje.estado} />
            <Seccion
              titulo="Con puesto"
              filas={conPuesto}
              estado={viaje.estado}
              vacio="Todavía nadie ha apartado. Los pasajeros ya ven tu viaje."
            />
            <Seccion
              titulo="Lista de espera"
              filas={enLista}
              estado={viaje.estado}
            />
          </>
        )}

        <div className="flex flex-col gap-2">
          {!(enRuta && libres(viaje) === 0) && (
            <OcuparPuesto
              viajeId={viaje.id}
              enRuta={enRuta}
              lleno={libres(viaje) === 0}
            />
          )}
          <MasOpciones
            viajeId={viaje.id}
            puestos={viaje.puestos}
            ocupados={viaje.ocupados}
            enRuta={enRuta}
          />
        </div>
      </>
    )
  }
}
