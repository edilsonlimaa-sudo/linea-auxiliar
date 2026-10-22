import { ChevronDownIcon, FlagIcon, TriangleAlertIcon } from "lucide-react"

import { BarraAccion } from "@/components/chofer/barra-accion"
import { FilaPasajero } from "@/components/chofer/fila-pasajero"
import { MeAtraso } from "@/components/chofer/me-atraso"
import { FilaLista } from "@/components/chofer/lista-tramo"
import { MasOpciones } from "@/components/chofer/mas-opciones"
import { OcuparPuesto } from "@/components/chofer/ocupar-puesto"
import { Asientos } from "@/components/pasajero/asientos"
import type {
  EntradaTramo,
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
  type EstadoViaje,
  type Viaje as ViajeBase,
} from "@/lib/viajes"

const PASOS = ["En camino", "Llegando", "Recogiendo", "En ruta"] as const
const PASO_DE: Partial<Record<EstadoViaje, number>> = {
  en_camino: 0,
  llegando: 1,
  en_parada: 2,
  en_ruta: 3,
}

/**
 * Dónde va el viaje, sin más texto: cuatro barras y lo que sigue. El título ya dice qué hace ahora en grande.
 * Un viaje "programado" todavía no empezó: no lleva barra.
 */
function PasosViaje({ estado }: { estado: EstadoViaje }) {
  const actual = PASO_DE[estado]
  if (actual === undefined) return null
  const siguiente = PASOS[actual + 1]
  return (
    <div className="flex flex-col gap-1.5">
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Avance del viaje">
        {PASOS.map((paso, i) => (
          <li
            key={paso}
            aria-current={i === actual ? "step" : undefined}
            className={cn(
              "h-2 rounded-full",
              i <= actual ? "bg-primary" : "bg-muted"
            )}
          >
            <span className="sr-only">
              {paso}
              {i < actual ? " (listo)" : i === actual ? " (ahora)" : ""}
            </span>
          </li>
        ))}
      </ol>
      <p aria-hidden className="text-sm text-muted-foreground">
        Paso {actual + 1} de {PASOS.length}
        {siguiente && ` · Después: ${siguiente.toLowerCase()}`}
      </p>
    </div>
  )
}

function Seccion({
  titulo,
  filas,
  estado,
  vacio,
  alerta = false,
}: {
  titulo: string
  filas: FilaChofer[]
  estado: Viaje["estado"]
  vacio?: string
  alerta?: boolean // lo que no se puede olvidar (recoger en el camino): en amarillo, arriba
}) {
  if (filas.length === 0 && !vacio) return null
  return (
    <section
      className={cn(
        "flex flex-col gap-2",
        alerta && "rounded-2xl border-2 border-warning bg-warning-muted p-3"
      )}
    >
      <h3
        className={cn(
          "text-[15px] font-bold tracking-wide uppercase",
          alerta ? "flex items-center gap-2 text-warning" : "text-muted-foreground"
        )}
      >
        {alerta && <FlagIcon aria-hidden className="size-5 shrink-0" />}
        {titulo}{" "}
        <span className={cn("font-normal", alerta ? "" : "text-muted-foreground")}>
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
    (f) =>
      `${f.personas > 1 ? `${f.desde}–${f.hasta}` : f.desde}. ${conAcompanantes(f.nombre, f.personas)}${f.lugar ? ` (${f.lugar})` : ""}`
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
  esperanEnCamino,
  dicenQueSubieron = [],
}: {
  viaje: Viaje
  porId: Map<string, ViajeBase>
  vehiculo: { unidad: string | null; placa: string } | null
  barraFija?: boolean
  plegado?: boolean
  esperanEnCamino?: EntradaTramo[] // R67: en ruta hacia Valle Grande, de la lista del tramo, sin carro y caben
  dicenQueSubieron?: string[] // R62: en Gina, quienes avisaron que se montaron y no están marcados Subió
}) {
  const { titulo, detalle: detalleBase } = estadoParaChofer(viaje, porId)
  // En ruta, "a bordo" son los que subieron: a quien falta recoger en el camino se lo cuenta aparte
  const sumar = (estado: FilaChofer["estado"]) =>
    viaje.lista.filter((f) => f.estado === estado && !f.pendiente).reduce((n, f) => n + f.personas, 0)
  const porRecoger = viaje.estado === "en_ruta" ? sumar("activa") : 0
  const detalle =
    porRecoger > 0
      ? `${sumar("subio") === 1 ? "1 pasajero a bordo" : `${sumar("subio")} pasajeros a bordo`} · ${porRecoger} por recoger`
      : detalleBase
  const enRuta = viaje.estado === "en_ruta"
  const conPuesto = viaje.lista.filter((f) => f.confirmado && !f.pendiente)
  const enLista = viaje.lista.filter((f) => !f.confirmado && !f.pendiente)
  const sinLlegar = conPuesto
    .filter((f) => f.conApp && !f.listo)
    .map((f) => f.nombre)
  const espera = enEspera(viaje)
  // Centro → Valle Grande, en Gina: los del camino a los que se les guarda puesto (R64–R66)
  const recogerEnCamino =
    viaje.estado === "en_parada"
      ? (viaje.gina ?? []).filter((e) => e.rol === "guardar")
      : []

  // Que nadie salga de Gina sin marcar a quien se montó (R66): sin nadie marcado, o con alguien que dice que ya subió
  const personasConPuesto = conPuesto.reduce((n, f) => n + f.personas, 0)
  const avisoSalida =
    viaje.gina && viaje.estado === "en_parada"
      ? dicenQueSubieron.length > 0
        ? `${dicenQueSubieron.join(", ")} ${dicenQueSubieron.length === 1 ? "dice que ya se montó y no está marcado" : "dicen que ya se montaron y no están marcados"} Subió: ${dicenQueSubieron.length === 1 ? "márcalo" : "márcalos"} en la lista antes de salir.`
        : personasConPuesto === 0
          ? "Nadie está marcado Subió. Si se montó alguien, márcalo en la lista antes de salir: así cuenta su puesto."
          : null
      : null

  const barra = (
    <BarraAccion
      viajeId={viaje.id}
      estado={viaje.estado}
      // Personas, no reservas: un grupo (R57) sube completo ("Beto +1" son 2)
      confirmados={personasConPuesto}
      sinLlegar={sinLlegar}
      enCamino={recogerEnCamino.map((e) => `${e.nombre} (${e.lugar})`)}
      avisoSalida={avisoSalida}
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
          {cuerpo(true)}
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
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
              {SENTIDOS[viaje.sentido].largo}
            </p>
            {ocupacion(true)}
          </div>
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
        <PasosViaje estado={viaje.estado} />
        {/* R70: una hora nueva si se atrasa (en amarillo si ya pasó la que dijo) */}
        {viaje.estado === "en_camino" && <MeAtraso viajeId={viaje.id} estadoEn={viaje.estado_en} etaMin={viaje.eta_min} />}
        {recogerEnCamino.length > 0 && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-2xl border-2 border-warning bg-warning-muted px-3 py-2.5"
          >
            <TriangleAlertIcon
              aria-hidden
              className="mt-0.5 size-5 shrink-0 text-warning"
            />
            <span>
              <strong>Al salir, recoges en el camino:</strong>{" "}
              {recogerEnCamino.map((e) => `${e.nombre} · ${e.lugar}`).join(", ")}
            </span>
          </p>
        )}
        {cuerpo(false)}
        {!barraFija && barra}
      </section>
      {barraFija && barra}
    </>
  )

  // Los puestos dibujados y "3 de 4": en la cabecera del viaje en foco, arriba de la lista en el plegado
  function ocupacion(corta: boolean) {
    const n = libres(viaje)
    return (
      <p className="flex shrink-0 items-center gap-2 font-bold">
        <Asientos
          puestos={viaje.puestos}
          ocupados={Math.min(viaje.ocupados, viaje.puestos)}
        />
        <span>
          {Math.min(viaje.ocupados, viaje.puestos)}/{viaje.puestos}
          {!corta && n > 0 && !enRuta && (
            <span className="text-success">
              {" "}
              · {n === 1 ? "1 libre" : `${n} libres`}
            </span>
          )}
          {espera > 0 && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {espera} en espera
            </span>
          )}
        </span>
      </p>
    )
  }

  // Lista y opciones: igual en la tarjeta abierta y en la plegada
  function cuerpo(conOcupacion: boolean) {
    return (
      <>
        {conOcupacion && ocupacion(false)}

        {enRuta ? (
          <>
            <Seccion
              titulo="Piden que pases por ellos"
              filas={viaje.lista.filter((f) => f.pendiente)}
              estado={viaje.estado}
            />
            {/* R67: avisaron en el camino después de que saliste de Gina. "Voy" la liga a este carro */}
            {esperanEnCamino && esperanEnCamino.length > 0 && (
              <section className="flex flex-col gap-2 rounded-2xl border-2 border-warning bg-warning-muted p-3">
                <h3 className="flex items-center gap-2 text-[15px] font-bold tracking-wide text-warning uppercase">
                  <FlagIcon aria-hidden className="size-5 shrink-0" />
                  Espera en el camino <span className="font-normal">({esperanEnCamino.length})</span>
                </h3>
                <p className="text-[15px] leading-snug">
                  {esperanEnCamino.length === 1 ? "Se anotó" : "Se anotaron"} después de que saliste de Gina. Toca <strong>Voy</strong> si pasas por ahí: los demás
                  choferes ya no paran.
                </p>
                <ol className="flex flex-col gap-2">
                  {esperanEnCamino.map((e) => (
                    <FilaLista key={e.id} entrada={e} viajeId={viaje.id} puedeIr puedeSubir conNoEstaba compacta />
                  ))}
                </ol>
              </section>
            )}
            {/* Lo que no se puede olvidar: a quién recoger en el camino, en amarillo y arriba */}
            <Seccion
              titulo="Recoge en el camino"
              filas={viaje.lista.filter(
                (f) => f.estado === "activa" && !f.pendiente
              )}
              estado={viaje.estado}
              alerta
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
            {/* Centro → Valle Grande: nadie aparta; se sube desde la lista del tramo (R64), que está fuera del viaje */}
            <Seccion
              titulo={viaje.gina ? "A bordo" : "Con puesto"}
              filas={conPuesto}
              estado={viaje.estado}
              vacio={
                viaje.gina
                  ? viaje.estado === "en_parada"
                    ? "Todavía no sube nadie. Abre la lista hacia Valle Grande para llamarlos."
                    : undefined
                  : "Todavía nadie ha apartado. Los pasajeros ya ven tu viaje."
              }
            />
            <Seccion
              titulo="Lista de espera"
              filas={enLista}
              estado={viaje.estado}
            />
          </>
        )}

        {/* Chicos y lado a lado: se usan poco. Sin lista de espera (R59): con el carro lleno no se anota a nadie */}
        <div className="grid grid-cols-2 gap-2">
          {libres(viaje) > 0 && (
            <OcuparPuesto viajeId={viaje.id} enRuta={enRuta} />
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
