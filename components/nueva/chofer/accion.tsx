"use client"

import { ArrowRight, Loader2, MessageCircle, TriangleAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { ConfirmarDrawer, ErrorAccion } from "@/components/nueva/chofer/comun"
import { Button } from "@/components/nueva/ui/button"
import { avanzarViaje } from "@/lib/acciones/chofer"
import type { EntradaTramo, ViajeChofer } from "@/lib/datos/inicio-chofer"
import { conAcompanantes, SENTIDOS, sumaPersonas } from "@/lib/viajes"

// La acción principal del chofer, fija abajo encima de las pestañas. Reglas de components/chofer/barra-accion.tsx y
// boton-terminar.tsx: una sola por estado, y las que no se deshacen preguntan antes.

const BARRA = "sticky bottom-16 z-10 -mx-4 mt-auto flex flex-col gap-2 border-t bg-background/90 p-4 backdrop-blur"
const MIN_EN_RUTA = 10 // antes de esto, Terminar pide confirmación (R71)

/** Mensaje listo para el grupo de WhatsApp al avisar llegada (R15) */
function mensajeGrupo(v: ViajeChofer, vehiculo: { unidad: string | null; placa: string } | null) {
  const confirmados = v.lista.filter((f) => f.confirmado)
  const carro = vehiculo ? ` · ${vehiculo.unidad ? `Unidad ${vehiculo.unidad} · ` : ""}${vehiculo.placa}` : ""
  const lineas = confirmados.map(
    (f) => `${f.personas > 1 ? `${f.desde}–${f.hasta}` : f.desde}. ${conAcompanantes(f.nombre, f.personas)}${f.lugar ? ` (${f.lugar})` : ""}`
  )
  return [
    `🚐 Llego en 3 minutos a recoger ${SENTIDOS[v.sentido].enRecogida}${carro}.`,
    confirmados.length === 0 ? "Hay puestos libres." : `Suben los puestos 1 al ${confirmados.at(-1)?.hasta ?? confirmados.length}:`,
    ...lineas,
  ].join("\n")
}

/**
 * Recogiendo, un botón por estado como el prototipo: en camino → Avisar que llego · llegando → Ya llegué (y avisar al grupo) · en Gina o en la
 * parada → Salir con N, que confirma con lo que no se puede olvidar (quien no avisó que está en el sitio, a quién recoge
 * en el camino y, en Gina, quien dice que ya se montó, R66). Al salir, Inicio pregunta qué hace después (R73).
 */
export function AccionRecogida({
  viaje,
  vehiculo,
  listaTramo,
}: {
  viaje: ViajeChofer
  vehiculo: { unidad: string | null; placa: string } | null
  listaTramo: EntradaTramo[]
}) {
  const router = useRouter()
  const { ejecutar, pendiente, error } = useAccion()
  const [salir, setSalir] = React.useState(false)
  const avanzar = (estado: ViajeChofer["estado"], alTerminar?: () => void) => ejecutar(() => avanzarViaje(viaje.id, estado), alTerminar)

  const conPuesto = viaje.lista.filter((f) => f.confirmado && !f.pendiente)
  const personas = sumaPersonas(conPuesto)
  const sinLlegar = conPuesto.filter((f) => f.conApp && !f.listo).map((f) => f.nombre)
  const enGina = viaje.sentido === "centro_a_vg" && viaje.estado === "en_parada"
  const enCamino = enGina ? (viaje.gina ?? []).filter((e) => e.rol === "guardar").map((e) => `${e.nombre} (${e.lugar})`) : []
  const dicen = enGina ? listaTramo.filter((e) => e.diceQueSubio).map((e) => e.nombre) : []
  const avisoSalida = enGina
    ? dicen.length > 0
      ? `${dicen.join(", ")} ${dicen.length === 1 ? "dice que ya se montó y no está marcado" : "dicen que ya se montaron y no están marcados"} Subió: ${dicen.length === 1 ? "márcalo" : "márcalos"} antes de salir.`
      : personas === 0
        ? "Nadie está marcado Subió. Si se montó alguien, márcalo antes de salir: así cuenta su puesto."
        : null
    : null

  return (
    <div className={BARRA}>
      <ErrorAccion error={salir ? undefined : error} />
      {/* Como el prototipo: un solo botón, que dice el paso siguiente (avisar → llegué → salir) */}
      {viaje.estado === "en_camino" ? (
        <Button size="lg" disabled={pendiente} onClick={() => avanzar("llegando")}>
          {pendiente ? <Loader2 className="animate-spin" /> : null}
          Avisar que llego
          <ArrowRight />
        </Button>
      ) : viaje.estado === "llegando" ? (
        <>
          <Button size="lg" disabled={pendiente} onClick={() => avanzar("en_parada")}>
            {pendiente ? <Loader2 className="animate-spin" /> : null}
            Ya llegué
            <ArrowRight />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            render={<a href={`https://wa.me/?text=${encodeURIComponent(mensajeGrupo(viaje, vehiculo))}`} target="_blank" rel="noreferrer" />}
            nativeButton={false}
          >
            <MessageCircle /> Avisar también al grupo
          </Button>
        </>
      ) : viaje.estado === "en_parada" ? (
        <Button size="lg" disabled={pendiente} onClick={() => setSalir(true)}>
          Salir
          <ArrowRight />
        </Button>
      ) : null}

      <ConfirmarDrawer
        abierto={salir}
        onCambiar={setSalir}
        titulo={personas === 1 ? "¿Salir con 1 pasajero?" : `¿Salir con ${personas} pasajeros?`}
        descripcion={
          <span className="flex flex-col gap-2">
            Al salir se cierra la lista.
            {sinLlegar.length > 0 ? (
              <strong className="text-foreground">
                {sinLlegar.length === 1 ? `${sinLlegar[0]} no ha avisado que está en el sitio.` : `${sinLlegar.join(", ")} no han avisado que están en el sitio.`}
              </strong>
            ) : null}
            {avisoSalida ? (
              <strong className="flex items-start gap-2 rounded-2xl bg-destructive/10 p-3 text-foreground">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                {avisoSalida}
              </strong>
            ) : null}
            {enCamino.length > 0 ? <strong className="text-foreground">En el camino recoges a {enCamino.join(", ")}.</strong> : null}
          </span>
        }
        confirmar="Sí, salir"
        variante="default"
        cancelar="Esperar un poco más"
        ocupado={pendiente}
        error={error}
        onConfirmar={() => avanzar("en_ruta", () => (setSalir(false), router.replace("/n/chofer?despues=1", { scroll: false })))}
      />
    </div>
  )
}

/**
 * Terminar el viaje en ruta (R14): a los pocos minutos de salir, confirma (R71). `fija`: el botón pegado abajo (en ruta
 * sin otro viaje); si no, dentro de la tarjeta del viaje en ruta.
 */
export function TerminarViaje({
  viaje,
  sinVuelta,
  fija = true,
}: {
  viaje: Pick<ViajeChofer, "id" | "sentido" | "salida_en" | "estado_en">
  sinVuelta: boolean
  fija?: boolean
}) {
  const router = useRouter()
  const { ejecutar, pendiente, error } = useAccion()
  // Al terminar, Inicio muestra el logro del viaje
  const celebrar = () => router.replace(`/n/chofer?terminado=${viaje.id}`, { scroll: false })
  const [haceMin, setHaceMin] = React.useState<number | null>(null)
  const salio = viaje.salida_en ?? viaje.estado_en
  const destino = SENTIDOS[viaje.sentido].destino

  const terminar = () => {
    const min = (Date.now() - new Date(salio).getTime()) / 60_000
    if (min < MIN_EN_RUTA) setHaceMin(Math.max(0, Math.floor(min)))
    else ejecutar(() => avanzarViaje(viaje.id, "finalizado"), celebrar)
  }

  const boton = (
    <Button size="lg" variant={fija ? "default" : "outline"} className="w-full" disabled={pendiente} onClick={terminar}>
      {pendiente && haceMin === null ? <Loader2 className="animate-spin" /> : null}
      Terminar
      <ArrowRight />
    </Button>
  )

  return (
    <>
      {fija ? (
        <div className={BARRA}>
          <ErrorAccion error={haceMin === null ? error : undefined} />
          {boton}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {boton}
          <ErrorAccion error={haceMin === null ? error : undefined} />
        </div>
      )}
      <ConfirmarDrawer
        abierto={haceMin !== null}
        onCambiar={(v) => !v && setHaceMin(null)}
        titulo={haceMin === 0 ? "Acabas de salir" : `Saliste hace ${haceMin === 1 ? "1 minuto" : `${haceMin} minutos`}`}
        descripcion={
          <span className="flex flex-col gap-2">
            ¿Ya dejaste a todos en {destino}? Al terminar, tus pasajeros ven que llegaron y tú quedas libre.
            {sinVuelta ? <strong className="text-foreground">Para publicar tu vuelta no hace falta terminar.</strong> : null}
          </span>
        }
        confirmar="Sí, terminar"
        variante="default"
        cancelar="No, sigo en ruta"
        ocupado={pendiente}
        error={error}
        onConfirmar={() => ejecutar(() => avanzarViaje(viaje.id, "finalizado"), () => (setHaceMin(null), celebrar()))}
      />
    </>
  )
}
