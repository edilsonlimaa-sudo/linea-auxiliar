import { PartyPopperIcon } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { EnVivo } from "@/components/en-vivo"
import { EsperanContigo, EstadoEspera, PasosEspera } from "@/components/pasajero/esperando"
import { EstadoLinea } from "@/components/pasajero/estado-linea"
import { TarjetaUnidad } from "@/components/pasajero/tarjeta-unidad"
import { Skeleton } from "@/components/ui/skeleton"
import { cargarEsperanConmigo, cargarInicioPasajero } from "@/lib/datos/inicio-pasajero"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { aceptaReservas, haciaEnFrase, ordenarParaPasajero } from "@/lib/viajes"

export const metadata: Metadata = { title: "Esperando · Línea Auxiliar" }

/**
 * Esperando (docs/especificacion.md §8): una pantalla de estado. Arriba dónde está la persona en el proceso (estado y
 * pasos); debajo, la unidad (o "buscando") y quién más espera en el mismo sentido (nombre corto, §6).
 * El sentido queda fijo. Se actualiza sola (EnVivo): la unidad aparece apenas haya (R32).
 */
export default async function PaginaEsperando() {
  const perfil = await exigirCuentaAprobada()
  if (perfil.rol !== "pasajero") redirect("/inicio")
  const datos = await cargarInicioPasajero(perfil.id)
  if (datos.miReserva) redirect("/mi-viaje")
  const espera = datos.miEspera
  if (!espera) redirect("/inicio")

  const { viajes, porId, lugaresRecientes, aviso } = datos
  const sentido = espera.sentido
  const unidades = ordenarParaPasajero(
    viajes.filter((v) => aceptaReservas(v) && v.sentido === sentido),
    porId
  )
  const hayUnidad = unidades.length > 0
  const conmigo = await cargarEsperanConmigo()
  const yo = espera.lat !== null && espera.lng !== null ? { lat: espera.lat, lng: espera.lng } : null

  return (
    <div className="flex flex-col gap-6">
      <EnVivo />
      <EstadoEspera sentido={sentido} lugar={espera.lugar} desde={espera.creado_en} recientes={lugaresRecientes} personas={espera.personas} />
      <PasosEspera hayUnidad={hayUnidad} />
      {aviso && <EstadoLinea aviso={aviso} />}

      <section aria-labelledby="titulo-unidad" aria-live="polite" className="flex flex-col gap-3">
        {hayUnidad ? (
          <>
            <h2 id="titulo-unidad" className="flex items-center gap-2 text-xl font-bold text-success">
              <PartyPopperIcon aria-hidden className="size-6" />
              {unidades.length === 1 ? `¡Ya hay una unidad ${haciaEnFrase(sentido)}!` : `¡Ya hay ${unidades.length} unidades ${haciaEnFrase(sentido)}!`}
            </h2>
            {unidades.map((v) => (
              <TarjetaUnidad key={v.id} viaje={v} porId={porId} yo={yo} recientes={lugaresRecientes} lugarInicial={espera.lugar} personas={espera.personas} />
            ))}
          </>
        ) : (
          // "Buscando": la silueta de la tarjeta que va a aparecer, latiendo
          <div className="flex flex-col gap-4 rounded-3xl border-2 border-dashed bg-card/60 p-4">
            <div aria-hidden className="flex flex-col gap-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-7 w-4/5" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
              <Skeleton className="h-13 w-full rounded-2xl" />
            </div>
            <div className="text-center">
              <h2 id="titulo-unidad" className="text-lg font-bold">
                Todavía no hay unidades {haciaEnFrase(sentido)}
              </h2>
              <p className="text-muted-foreground">Te la mostramos apenas salga. Esta pantalla se actualiza sola.</p>
            </div>
          </div>
        )}
      </section>

      <EsperanContigo sentido={sentido} personas={conmigo} />
    </div>
  )
}
