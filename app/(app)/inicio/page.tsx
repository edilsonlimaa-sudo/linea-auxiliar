import { ArrowLeftIcon, BusIcon, ChevronRightIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { EnVivo } from "@/components/en-vivo"
import { InicioChofer } from "@/components/chofer/inicio-chofer"
import { AvisoCierre } from "@/components/pasajero/aviso-cierre"
import { EstadoLinea } from "@/components/pasajero/estado-linea"
import { AvisameCuandoHaya } from "@/components/pasajero/esperando"
import { SelectorSentido, sentidoDeHacia } from "@/components/pasajero/selector-sentido"
import { TarjetaUnidad } from "@/components/pasajero/tarjeta-unidad"
import { cargarInicioChofer } from "@/lib/datos/inicio-chofer"
import {
  cargarAvisoDeCierre,
  cargarCalificacionPendiente,
  cargarInicioPasajero,
  type AvisoDeCierre,
  type DatosInicioPasajero,
  type MiReserva,
} from "@/lib/datos/inicio-pasajero"
import { saludo } from "@/lib/fechas"
import { exigirCuentaAprobada, type Perfil } from "@/lib/sesion"
import {
  aceptaReservas,
  haciaEnFrase,
  libres,
  ordenarParaPasajero,
  otrasConPuesto,
  SENTIDOS,
  sentidoSugerido,
  type Sentido,
} from "@/lib/viajes"

export const metadata: Metadata = { title: "Inicio · Línea Auxiliar" }

export default async function PaginaInicio({ searchParams }: PageProps<"/inicio">) {
  const perfil = await exigirCuentaAprobada()

  // Inicio del chofer: demanda y publicar; con viaje abierto, su gestión (docs/especificacion.md §8)
  if (perfil.rol === "chofer") {
    const datos = await cargarInicioChofer(perfil.id, perfil.conectado_en !== null)
    return <InicioChofer nombre={perfil.nombre} datos={datos} />
  }

  const { cambiar, hacia } = await searchParams
  const datos = await cargarInicioPasajero(perfil.id)

  // Con un viaje en curso, Inicio es Mi viaje; solo se queda aquí para cambiarse de unidad desde la lista de
  // espera (docs/especificacion.md §8). A bordo ya no hay cambio posible.
  if (datos.miReserva) {
    if (cambiar !== "1" || datos.miReserva.reserva.estado !== "activa") redirect("/mi-viaje")
    return <CambiarDeUnidad datos={datos} miReserva={datos.miReserva} />
  }
  // Viaje terminado sin calificar: primero "¿Cómo te fue?" (R45)
  const [pendiente, cierre] = await Promise.all([cargarCalificacionPendiente(perfil.id), cargarAvisoDeCierre(perfil.id)])
  if (pendiente) redirect("/mi-viaje")
  // Esperando es un estado aparte, con el sentido fijo (§8)
  if (datos.miEspera) redirect("/esperando")
  return <InicioPasajero perfil={perfil} datos={datos} cierre={cierre} hacia={sentidoDeHacia(hacia)} />
}

/**
 * Sin reserva (docs/especificacion.md §8): Inicio es "quiero viajar". Una línea con cuántos choferes trabajan (lleva a
 * La línea) → ¿Hacia dónde vas? → las unidades de ese sentido. El lugar se pregunta recién al apartar (R27).
 * Sin unidad con puesto: "Avísame cuando haya una" (R31). Ver la línea y el menú cubren lo demás.
 */
function InicioPasajero({
  perfil,
  datos,
  cierre,
  hacia,
}: {
  perfil: Perfil
  datos: DatosInicioPasajero
  cierre: AvisoDeCierre | null
  hacia: Sentido | null
}) {
  const { viajes, porId, lugaresRecientes, aviso, enServicio } = datos
  const disponibles = ordenarParaPasajero(viajes.filter(aceptaReservas), porId)
  // Empieza en el sentido sugerido por la hora y dónde vive. Cambiarlo es un toque.
  const sentido = hacia ?? sentidoSugerido(perfil.urbanismo)
  const unidades = disponibles.filter((v) => v.sentido === sentido)
  const cuantas = Object.fromEntries(
    (Object.keys(SENTIDOS) as Sentido[]).map((s) => [s, disponibles.filter((v) => v.sentido === s).length])
  ) as Record<Sentido, number>
  // ¿Cuántos van? se pregunta al apartar (R57)
  const conPuesto = unidades.some((v) => libres(v) > 0)

  return (
    <div className="flex flex-col gap-6">
      <EnVivo />
      {cierre && <AvisoCierre aviso={cierre} />}
      <header className="flex flex-col gap-2">
        <h1 className="text-[26px] leading-tight font-bold">
          {saludo()}, {perfil.nombre.split(" ")[0]}
        </h1>
        {/* "¿Cómo está la línea?" en una línea; el detalle y el mapa de todos están en La línea */}
        <Link
          href="/linea"
          className="flex min-h-12 items-center gap-2.5 self-start rounded-full border-2 bg-card px-4 py-2 font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
        >
          <span aria-hidden className={enServicio.length > 0 ? "size-2.5 rounded-full bg-success" : "size-2.5 rounded-full bg-muted-foreground"} />
          {enServicio.length === 0
            ? "Ningún chofer trabajando ahora"
            : enServicio.length === 1
              ? "1 chofer trabajando"
              : `${enServicio.length} choferes trabajando`}
          <span className="text-primary">· Ver la línea</span>
          <ChevronRightIcon aria-hidden className="size-5 text-primary" />
        </Link>
      </header>
      {aviso && <EstadoLinea aviso={aviso} />}

      <SelectorSentido actual={sentido} unidades={cuantas} />

      <section aria-labelledby="titulo-unidades" className="flex flex-col gap-3">
        <h2 id="titulo-unidades" className="text-xl font-bold">
          Unidades {SENTIDOS[sentido].hacia}
        </h2>
        {unidades.map((v) => (
          <TarjetaUnidad key={v.id} viaje={v} porId={porId} recientes={lugaresRecientes} />
        ))}
        {!conPuesto && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-5 py-7 text-center">
            <BusIcon aria-hidden className="size-10 text-muted-foreground" />
            <p className="text-lg font-bold">
              {unidades.length === 0 ? `Ahora no hay unidades ${haciaEnFrase(sentido)}` : "Todas van llenas por ahora"}
            </p>
            <p className="text-muted-foreground">Déjanos tu lugar y te avisamos. Los choferes ven que alguien espera.</p>
            <AvisameCuandoHaya sentido={sentido} recientes={lugaresRecientes} />
          </div>
        )}
      </section>
    </div>
  )
}

/** En lista de espera: otras unidades del mismo sentido con puesto (R22). Apartar en una cancela la anterior (R18). */
function CambiarDeUnidad({ datos, miReserva }: { datos: DatosInicioPasajero; miReserva: MiReserva }) {
  const { viajes, porId } = datos
  const otras = otrasConPuesto(viajes, miReserva.viaje, porId, miReserva.reserva.personas)

  return (
    <div className="flex flex-col gap-5">
      <EnVivo />
      <Link href="/mi-viaje" className="flex min-h-11 items-center gap-2 self-start font-bold text-primary underline-offset-4 hover:underline">
        <ArrowLeftIcon aria-hidden className="size-5" />
        Volver a mi viaje
      </Link>
      <div>
        <h1 className="text-[26px] leading-tight font-bold">Cambiarme a otra unidad</h1>
        <p className="text-muted-foreground">
          {SENTIDOS[miReserva.viaje.sentido].largo}. Si apartas en una de estas, dejas la lista de espera de {miReserva.viaje.chofer.nombre}.
        </p>
      </div>
      {otras.length > 0 ? (
        otras.map((v) => (
          <TarjetaUnidad
            key={v.id}
            viaje={v}
            porId={porId}
            reservaAnterior={miReserva.viaje.chofer.nombre}
            personas={miReserva.reserva.personas}
            yo={miReserva.reserva.lat !== null && miReserva.reserva.lng !== null ? { lat: miReserva.reserva.lat, lng: miReserva.reserva.lng } : null}
          />
        ))
      ) : (
        <p className="rounded-3xl border-2 border-dashed px-5 py-8 text-center text-lg font-bold">
          Ahora no hay otra unidad con puesto. Sigues en la lista de espera.
        </p>
      )}
    </div>
  )
}
