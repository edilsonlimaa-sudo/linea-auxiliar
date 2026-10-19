import { HistoryIcon, StarIcon } from "lucide-react"
import Link from "next/link"

import { AgregarViaje } from "@/components/chofer/agregar-viaje"
import { CompartirUbicacion } from "@/components/chofer/compartir-ubicacion"
import { Conexion } from "@/components/chofer/conexion"
import { Demanda, DemandaCompacta, sentidoConMasDemanda } from "@/components/chofer/demanda"
import { ViajeChofer } from "@/components/chofer/viaje-chofer"
import { EnVivo } from "@/components/en-vivo"
import { EstadoDeLaLinea } from "@/components/pasajero/estado-de-la-linea"
import type { DatosInicioChofer } from "@/lib/datos/inicio-chofer"
import { saludo } from "@/lib/fechas"
import type { Viaje } from "@/lib/viajes"

const companerosTexto = (n: number) =>
  n === 0 ? "Nadie más está trabajando ahora" : n === 1 ? "1 compañero trabajando ahora" : `${n} compañeros trabajando ahora`

/**
 * Inicio del chofer (docs/especificacion.md §8). Sin viajes: primero la demanda ("¿hay gente esperando?") y
 * publicar es la acción principal, en una hoja. Con viajes abiertos: su gestión, con la demanda arriba en una línea.
 * El viaje "en foco" lleva la acción principal pegada abajo: el que va en ruta o, si no, la recogida actual.
 */
export function InicioChofer({ nombre, datos }: { nombre: string; datos: DatosInicioChofer }) {
  const { conectado, enRuta, recogida, proximos, esperando, oferta, companeros, ultimo, vehiculo } = datos
  const abiertos = [enRuta, recogida, ...proximos].filter((v) => v !== null)
  const porId = new Map<string, Viaje>(abiertos.map((v) => [v.id, v]))
  const publicados = [recogida, ...proximos].filter((v) => v !== null).length

  // Sin viajes abiertos: puerta de entrada con la demanda y "Publicar un viaje"
  if (abiertos.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <EnVivo />
        <h1 className="text-[26px] leading-tight font-bold">
          {saludo()}, {nombre.split(" ")[0]}
        </h1>
        <Conexion conectado={conectado} viajesAbiertos={0} />
        <Demanda esperando={esperando} oferta={oferta} />
        <AgregarViaje modo="primero" esperando={esperando} ultimo={ultimo} sentidoInicial={sentidoConMasDemanda({ esperando, oferta })} />
        <EstadoDeLaLinea choferes={companeros} aviso={null} titulo="Compañeros en la ruta" cantidad={companerosTexto} />
        <nav aria-label="Atajos" className="grid grid-cols-2 gap-3">
          <Atajo href="/mis-viajes" icono={<HistoryIcon aria-hidden className="size-6 shrink-0 text-primary" />} texto="Mis viajes" />
          <Atajo href="/calificaciones" icono={<StarIcon aria-hidden className="size-6 shrink-0 text-primary" />} texto="Mis calificaciones" />
        </nav>
      </div>
    )
  }

  // Con viajes abiertos: la gestión del viaje
  // Con una recogida en curso, el viaje nuevo queda como próximo; si solo va en ruta, empieza ya (R11–R13)
  const modoAgregar = recogida ? "cadena" : "desde_ruta"
  // El viaje nuevo sale de donde termina el último de la cadena: se sugiere el sentido contrario a ese
  const finDeCadena = abiertos.at(-1)
  const sugerencia = finDeCadena ? { sentido: finDeCadena.sentido, puestos: finDeCadena.puestos } : ultimo

  return (
    <div className="flex flex-col gap-5">
      <EnVivo />
      <h1 className="sr-only">Inicio</h1>
      <Conexion conectado={conectado} viajesAbiertos={publicados} />
      {/* Con viajes abiertos y conectado, comparte la posición para el mapa de los pasajeros (R40) */}
      {conectado && <CompartirUbicacion />}
      <DemandaCompacta esperando={esperando} oferta={oferta} />

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
    </div>
  )
}

function Atajo({ href, icono, texto }: { href: string; icono: React.ReactNode; texto: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
    >
      {icono}
      {texto}
    </Link>
  )
}
