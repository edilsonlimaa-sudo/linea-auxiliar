import { UsersIcon } from "lucide-react"

import { EnVivo } from "@/components/en-vivo"
import { AgregarViaje } from "@/components/chofer/agregar-viaje"
import { CompartirUbicacion } from "@/components/chofer/compartir-ubicacion"
import { Conexion } from "@/components/chofer/conexion"
import { PublicarViaje } from "@/components/chofer/publicar-viaje"
import { ViajeChofer } from "@/components/chofer/viaje-chofer"
import type { DatosInicioChofer } from "@/lib/datos/inicio-chofer"
import { haciaEnFrase, type Sentido, type Viaje } from "@/lib/viajes"

/**
 * Mi viaje del chofer (docs/especificacion.md §8). El viaje "en foco" lleva la acción principal pegada abajo:
 * el que va en ruta (hay que terminarlo) o, si no, la recogida actual. Debajo, "Agregar otro viaje" y los
 * próximos viajes plegados (R11).
 */
export function InicioChofer({ nombre, datos }: { nombre: string; datos: DatosInicioChofer }) {
  const { conectado, enRuta, recogida, proximos, esperando, ultimo, vehiculo } = datos
  const abiertos = [enRuta, recogida, ...proximos].filter((v) => v !== null)
  const porId = new Map<string, Viaje>(abiertos.map((v) => [v.id, v]))
  const publicados = [recogida, ...proximos].filter((v) => v !== null).length
  // Con una recogida en curso, el viaje nuevo queda como próximo; si solo va en ruta, empieza ya (R11–R13)
  const modoAgregar = recogida ? "cadena" : "desde_ruta"
  // El viaje nuevo sale de donde termina el último de la cadena: se sugiere el sentido contrario a ese
  const finDeCadena = abiertos.at(-1)
  const sugerencia = finDeCadena ? { sentido: finDeCadena.sentido, puestos: finDeCadena.puestos } : ultimo

  return (
    <div className="flex flex-col gap-5">
      <EnVivo />
      <div>
        <p className="text-muted-foreground">Hola, {nombre.split(" ")[0]}</p>
        <h1 className="text-[26px] leading-tight font-bold">{abiertos.length > 0 ? "Mi viaje" : "Publicar un viaje"}</h1>
      </div>

      <Conexion conectado={conectado} viajesAbiertos={publicados} />
      {/* Con viajes abiertos y conectado, comparte la posición para el mapa de los pasajeros (R40) */}
      {conectado && abiertos.length > 0 && <CompartirUbicacion />}

      {abiertos.length === 0 ? (
        <>
          {/* La demanda es el incentivo para salir a trabajar (R31): solo cuántos, nunca quién */}
          {(Object.keys(esperando) as Sentido[]).some((s) => esperando[s] > 0) && (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-signal bg-signal/15 px-4 py-3">
              <UsersIcon aria-hidden className="mt-0.5 size-6 shrink-0" />
              <ul className="font-bold">
                {(Object.keys(esperando) as Sentido[])
                  .filter((s) => esperando[s] > 0)
                  .map((s) => (
                    <li key={s}>
                      {esperando[s] === 1 ? "1 persona espera" : `${esperando[s]} personas esperan`} para ir {haciaEnFrase(s)}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <PublicarViaje modo="primero" esperando={esperando} ultimo={ultimo} />
        </>
      ) : (
        <>
          {enRuta && <ViajeChofer viaje={enRuta} porId={porId} vehiculo={vehiculo} barraFija />}
          {recogida && (
            <>
              {enRuta && <h2 className="mt-2 text-xl font-bold">Tu siguiente recogida</h2>}
              <ViajeChofer viaje={recogida} porId={porId} vehiculo={vehiculo} barraFija={!enRuta} />
            </>
          )}

          {proximos.length > 0 && (
            <section aria-labelledby="titulo-proximos" className="flex flex-col gap-3">
              <h2 id="titulo-proximos" className="mt-2 text-xl font-bold">
                Próximos viajes
              </h2>
              {proximos.map((v) => (
                <ViajeChofer key={v.id} viaje={v} porId={porId} vehiculo={vehiculo} plegado />
              ))}
            </section>
          )}

          <AgregarViaje modo={modoAgregar} esperando={esperando} ultimo={sugerencia} />
          {/* Espacio para que la barra fija de abajo no tape lo último de la página */}
          <div aria-hidden className="h-36" />
        </>
      )}
    </div>
  )
}
