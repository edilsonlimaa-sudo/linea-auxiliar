import { ArrowLeftIcon, BusIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { EnVivo } from "@/components/en-vivo"
import { InicioChofer } from "@/components/chofer/inicio-chofer"
import { AvisoCierre } from "@/components/pasajero/aviso-cierre"
import { EstadoEspera, FormularioEspera } from "@/components/pasajero/esperando"
import { EstadoLinea } from "@/components/pasajero/estado-linea"
import { TarjetaUnidad } from "@/components/pasajero/tarjeta-unidad"
import { cargarInicioChofer } from "@/lib/datos/inicio-chofer"
import {
  cargarAvisoDeCierre,
  cargarCalificacionPendiente,
  cargarInicioPasajero,
  type AvisoDeCierre,
  type DatosInicioPasajero,
  type MiReserva,
  type ViajeConChofer,
} from "@/lib/datos/inicio-pasajero"
import { exigirCuentaAprobada, type Perfil } from "@/lib/sesion"
import type { Punto } from "@/lib/mapa"
import { cn } from "@/lib/utils"
import {
  aceptaReservas,
  haciaEnFrase,
  llegada,
  ordenarParaPasajero,
  otrasConPuesto,
  SENTIDOS,
  sentidoSugerido,
  type Sentido,
  type Viaje,
} from "@/lib/viajes"

export const metadata: Metadata = { title: "Inicio · Línea Auxiliar" }

export default async function PaginaInicio({ searchParams }: PageProps<"/inicio">) {
  const perfil = await exigirCuentaAprobada()

  // El Inicio del chofer es su "Mi viaje" (docs/especificacion.md §8)
  if (perfil.rol === "chofer") {
    const datos = await cargarInicioChofer(perfil.id, perfil.conectado_en !== null)
    return <InicioChofer nombre={perfil.nombre} datos={datos} />
  }

  const { cambiar } = await searchParams
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
  return <InicioPasajero perfil={perfil} datos={datos} cierre={cierre} />
}

/**
 * Sin reserva (docs/especificacion.md §8 "Inicio del pasajero"): las preguntas en orden, una por vez.
 * 1. ¿Hay choferes trabajando?  2. ¿Hacia dónde vas? + ¿Dónde estás? → Avisar que estoy esperando.
 * 3. Esperando: las unidades de ese sentido, cada una con Apartar de un toque (R27).
 */
function InicioPasajero({ perfil, datos, cierre }: { perfil: Perfil; datos: DatosInicioPasajero; cierre: AvisoDeCierre | null }) {
  const { viajes, porId, miEspera, lugaresRecientes, aviso, unidadesEnServicio } = datos
  const disponibles = ordenarParaPasajero(viajes.filter(aceptaReservas), porId)

  // Una línea por sentido, para quien solo quiere saber si vale la pena salir
  const resumenes = Object.fromEntries(
    (Object.keys(SENTIDOS) as Sentido[]).map((s) => {
      const lista = disponibles.filter((v) => v.sentido === s)
      if (lista.length === 0) return [s, `Ahora no hay unidades ${haciaEnFrase(s)}.`]
      const proxima = llegada(lista[0], porId).principal
      const cuantas = lista.length === 1 ? "1 unidad va" : `${lista.length} unidades van`
      return [s, `${cuantas} ${haciaEnFrase(s)} · la próxima ${proxima[0].toLowerCase()}${proxima.slice(1)}.`]
    })
  ) as Record<Sentido, string>

  return (
    <div className="flex flex-col gap-6">
      <EnVivo />
      {cierre && <AvisoCierre aviso={cierre} />}

      {/* 1. ¿Hay choferes trabajando? */}
      <section aria-label="Choferes trabajando" className="flex flex-col gap-3">
        <p className="text-muted-foreground">Hola, {perfil.nombre.split(" ")[0]}</p>
        <p className="flex items-center gap-3 text-2xl leading-tight font-bold">
          <span aria-hidden className={cn("size-4 shrink-0 rounded-full", unidadesEnServicio > 0 ? "bg-success" : "bg-muted-foreground")} />
          {unidadesEnServicio === 0
            ? "Ningún chofer trabajando ahora"
            : unidadesEnServicio === 1
              ? "1 chofer trabajando ahora"
              : `${unidadesEnServicio} choferes trabajando ahora`}
        </p>
        {unidadesEnServicio === 0 && !miEspera && (
          <p className="text-muted-foreground">Igual puedes avisar que estás esperando: los choferes ven cuánta gente quiere ir.</p>
        )}
        <EstadoLinea aviso={aviso} />
      </section>

      {miEspera ? (
        <>
          {/* 3. Esperando: las unidades de su sentido */}
          <EstadoEspera
            sentido={miEspera.sentido}
            lugar={miEspera.lugar}
            desde={miEspera.creado_en}
            recientes={lugaresRecientes}
            resumenes={resumenes}
          />
          <UnidadesDelSentido
            sentido={miEspera.sentido}
            viajes={disponibles.filter((v) => v.sentido === miEspera.sentido)}
            porId={porId}
            yo={miEspera.lat !== null && miEspera.lng !== null ? { lat: miEspera.lat, lng: miEspera.lng } : null}
          />
        </>
      ) : (
        <>
          {/* 2. ¿Hacia dónde vas? y ¿Dónde estás? */}
          <h1 className="sr-only">Avisar que estás esperando</h1>
          <FormularioEspera recientes={lugaresRecientes} sentidoInicial={sentidoSugerido(perfil.urbanismo)} resumenes={resumenes} />
        </>
      )}
    </div>
  )
}

function UnidadesDelSentido({
  sentido,
  viajes,
  porId,
  yo,
}: {
  sentido: Sentido
  viajes: ViajeConChofer[]
  porId: Map<string, Viaje>
  yo: Punto | null
}) {
  return (
    <section aria-labelledby="titulo-unidades" className="flex flex-col gap-3">
      <h2 id="titulo-unidades" className="text-xl font-bold">
        Unidades {SENTIDOS[sentido].hacia}
      </h2>
      {viajes.length > 0 ? (
        viajes.map((v) => <TarjetaUnidad key={v.id} viaje={v} porId={porId} yo={yo} />)
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed px-5 py-8 text-center">
          <BusIcon aria-hidden className="size-10 text-muted-foreground" />
          <p className="text-lg font-bold">Todavía no hay unidades {haciaEnFrase(sentido)}</p>
          <p className="text-muted-foreground">Te avisamos cuando venga una. Esta pantalla se actualiza sola.</p>
        </div>
      )}
    </section>
  )
}

/** En lista de espera: otras unidades del mismo sentido con puesto (R22). Apartar en una cancela la anterior (R18). */
function CambiarDeUnidad({ datos, miReserva }: { datos: DatosInicioPasajero; miReserva: MiReserva }) {
  const { viajes, porId } = datos
  const otras = otrasConPuesto(viajes, miReserva.viaje, porId)

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
