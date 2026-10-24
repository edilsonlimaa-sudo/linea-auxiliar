"use client"

import { ChevronDownIcon, ChevronUpIcon, FlagIcon, HandIcon } from "lucide-react"
import { useCallback, useSyncExternalStore } from "react"

import { BotonTerminar } from "@/components/chofer/boton-terminar"
import { FilaPasajero } from "@/components/chofer/fila-pasajero"
import { FilaLista } from "@/components/chofer/lista-tramo"
import { MasOpciones } from "@/components/chofer/mas-opciones"
import { OcuparPuesto } from "@/components/chofer/ocupar-puesto"
import type { EntradaTramo, ViajeChofer } from "@/lib/datos/inicio-chofer"
import { hora } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { contrario, duracion, libres, SENTIDOS, sumaPersonas } from "@/lib/viajes"

// Abierto o cerrado, por viaje: queda como lo dejó al refrescar o volver a la app (R75)
const clave = (viajeId: string) => `en-ruta-abierto:${viajeId}`
const EVENTO = "en-ruta-abierto"
function leerAbierto(viajeId: string): boolean {
  try {
    return localStorage.getItem(clave(viajeId)) === "1"
  } catch {
    return false
  }
}
function guardarAbierto(viajeId: string, abierto: boolean) {
  try {
    if (abierto) localStorage.setItem(clave(viajeId), "1")
    else localStorage.removeItem(clave(viajeId))
  } catch {}
  window.dispatchEvent(new Event(EVENTO))
}

/**
 * El viaje en ruta, compacto arriba (R75): una barra azul pegada al tope ("En ruta hacia … · Salió 9:01 · hace 18 min ·
 * 4 a bordo") con lo que no puede esperar (pedido en el camino, quien espera o hay que recoger en el camino) aunque esté
 * cerrada. "Ver" la abre en su lugar: la misma barra y, pegado debajo, una línea por persona con su acción y las acciones
 * del viaje (Subió alguien · Opciones · Terminar). Abierta deja de pegarse al tope.
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
  const suscribir = useCallback((avisar: () => void) => {
    window.addEventListener(EVENTO, avisar)
    window.addEventListener("storage", avisar)
    return () => {
      window.removeEventListener(EVENTO, avisar)
      window.removeEventListener("storage", avisar)
    }
  }, [])
  const abierto = useSyncExternalStore(suscribir, () => leerAbierto(viaje.id), () => false)
  const cambiar = (v: boolean) => guardarAbierto(viaje.id, v)

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
    <section
      aria-label={`Tu viaje en ruta ${SENTIDOS[viaje.sentido].hacia}`}
      // Cerrada, pegada al tope justo debajo de la barra de la app (con su franja de fondo, para que lo que pasa por
      // debajo no se asome); abierta, rueda con la página
      className={cn("z-10 flex flex-col", !abierto && "sticky top-17 -mt-2 bg-background pt-2")}
    >
      <div className={cn("flex flex-col gap-2 bg-primary px-3 py-2.5 text-primary-foreground shadow-md", abierto ? "rounded-t-2xl" : "rounded-2xl")}>
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 leading-tight">
            <span className="block font-bold">En ruta {SENTIDOS[viaje.sentido].hacia}</span>
            <span className="block text-sm opacity-90">
              {/* La hora y "hace N min", solo en el navegador: el formato de la hora del servidor no es igual al del celular */}
              {ahora > 0 && (
                <>
                  <span className="whitespace-nowrap">Salió {hora(salio)}</span> ·{" "}
                  <span className="whitespace-nowrap">hace {duracion(Math.max(0, (ahora - new Date(salio).getTime()) / 60_000))}</span> ·{" "}
                </>
              )}
              <span className="whitespace-nowrap">{personasABordo === 1 ? "1 a bordo" : `${personasABordo} a bordo`}</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => cambiar(!abierto)}
            aria-expanded={abierto}
            className="flex min-h-10 shrink-0 items-center gap-1 rounded-full border-2 border-primary-foreground/40 px-3 font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            {abierto ? "Ocultar" : "Ver"}
            {abierto ? <ChevronUpIcon aria-hidden className="size-4" /> : <ChevronDownIcon aria-hidden className="size-4" />}
          </button>
        </div>

        {/* Lo que no puede esperar, aunque esté cerrada: un toque la abre */}
        {!abierto && pedidos.length > 0 && (
          <button
            type="button"
            onClick={() => cambiar(true)}
            className="flex items-center gap-2 rounded-xl bg-destructive px-3 py-2 text-left text-sm font-bold text-white outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <HandIcon aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              {pedidos.length === 1
                ? `${pedidos[0].nombre} pide que pases${pedidos[0].lugar ? ` · ${pedidos[0].lugar}` : ""}`
                : `${pedidos.length} piden que pases`}
            </span>
            <span className="shrink-0 rounded-full bg-card px-2.5 py-0.5 text-destructive">Responder</span>
          </button>
        )}
        {!abierto && (porRecoger.length > 0 || esperanEnCamino.length > 0) && (
          <button
            type="button"
            onClick={() => cambiar(true)}
            className="flex items-center gap-2 rounded-xl bg-warning-muted px-3 py-2 text-left text-sm font-bold text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <FlagIcon aria-hidden className="size-4 shrink-0 text-warning" />
            <span className="min-w-0 flex-1">
              {porRecoger.length > 0
                ? `Recoge en el camino: ${porRecoger.map((f) => f.lugar ?? f.nombre).join(", ")}`
                : esperanEnCamino.length === 1
                  ? "1 espera en el camino"
                  : `${esperanEnCamino.length} esperan en el camino`}
            </span>
            <span className="shrink-0 rounded-full bg-card px-2.5 py-0.5 text-warning">Ver</span>
          </button>
        )}
      </div>

      {abierto && (
        <div className="flex flex-col gap-1 rounded-b-2xl border-2 border-t-0 border-primary bg-card px-3 pt-1 pb-3">
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
            {libres(viaje) > 0 && <OcuparPuesto viajeId={viaje.id} enRuta />}
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
      )}
    </section>
  )
}
