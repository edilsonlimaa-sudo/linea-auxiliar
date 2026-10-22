import { ArrowLeftIcon, BusIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { EnVivo } from "@/components/en-vivo"
import { InicioChofer } from "@/components/chofer/inicio-chofer"
import { AvisoCierre } from "@/components/pasajero/aviso-cierre"
import { EstadoLinea } from "@/components/pasajero/estado-linea"
import { CabeceraInicio, sentidoDeHacia } from "@/components/pasajero/cabecera-inicio"
import { ListaGina } from "@/components/pasajero/lista-gina"
import { QuienVuelve } from "@/components/pasajero/quien-vuelve"
import { TarjetaUnidad } from "@/components/pasajero/tarjeta-unidad"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
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
import { cargarListaGina, type EnListaGina } from "@/lib/datos/lista-gina"
import { exigirCuentaAprobada, type Perfil } from "@/lib/sesion"
import {
  aceptaReservas,
  carrosHaciaValle,
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
    const { vuelta } = await searchParams
    return <InicioChofer nombre={perfil.nombre} datos={datos} preguntarVuelta={vuelta === "1"} />
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
  const [pendiente, cierre, lista] = await Promise.all([
    cargarCalificacionPendiente(perfil.id),
    cargarAvisoDeCierre(perfil.id),
    cargarListaGina(),
  ])
  // Anotado en la lista hacia Valle Grande: como quien aparta puesto, su viaje es Mi viaje (§5.17)
  if (pendiente || lista.some((e) => e.esMio)) redirect("/mi-viaje")
  return <InicioPasajero perfil={perfil} datos={datos} cierre={cierre} hacia={sentidoDeHacia(hacia)} lista={lista} />
}

/**
 * Sin reserva (docs/especificacion.md §8): Inicio es "quiero viajar". Una pregunta, una respuesta, una acción:
 * el bloque principal pregunta "¿Hacia dónde vas?" (con quiénes trabajan abajo) → las unidades de ese sentido, la que
 * recoge primero destacada → Apartar. Sin unidad con puesto, lo dice (sin "Avísame" por ahora, R31 suspendida).
 */
function InicioPasajero({
  perfil,
  datos,
  cierre,
  hacia,
  lista,
}: {
  perfil: Perfil
  datos: DatosInicioPasajero
  cierre: AvisoDeCierre | null
  hacia: Sentido | null
  lista: EnListaGina[]
}) {
  const { viajes, porId, aviso, enServicio, enPausa } = datos
  const disponibles = ordenarParaPasajero(viajes.filter(aceptaReservas), porId)
  // Empieza en el sentido sugerido por la hora y dónde vive. Cambiarlo es un toque.
  const sentido = hacia ?? sentidoSugerido(perfil.urbanismo)
  const unidades = disponibles.filter((v) => v.sentido === sentido)
  const cuantas = Object.fromEntries(
    (Object.keys(SENTIDOS) as Sentido[]).map((s) => [s, disponibles.filter((v) => v.sentido === s).length])
  ) as Record<Sentido, number>
  // ¿Cuántos van? se pregunta al apartar (R57). La primera con puesto (ya vienen ordenadas, R16) se destaca
  const primeraConPuesto = unidades.find((v) => libres(v) > 0 && v.estado !== "en_ruta")
  const conPuesto = unidades.some((v) => libres(v) > 0)

  return (
    <div className="flex flex-col gap-6">
      <EnVivo />
      {cierre && <AvisoCierre aviso={cierre} />}
      <CabeceraInicio
        saludo={`${saludo()}, ${perfil.nombre.split(" ")[0]}`}
        sentido={sentido}
        unidades={cuantas}
        choferes={enServicio}
        enPausa={enPausa}
        viajes={viajes}
      />
      {aviso && <EstadoLinea aviso={aviso} />}

      {/* Centro → Valle Grande: no se aparta, se espera en la Lista de Gina (§5.17) */}
      {sentido === "centro_a_vg" ? (
        <ListaGina
          lista={lista}
          carros={carrosHaciaValle(viajes, porId)}
          porId={porId}
          enPausa={enPausa}
        />
      ) : (
        <section aria-labelledby="titulo-unidades" className="flex flex-col gap-3">
          <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id="titulo-unidades" className="flex items-center gap-2 text-xl font-bold">
              Unidades {SENTIDOS[sentido].hacia}
              {unidades.length > 0 && <Badge variant="secondary">{unidades.length}</Badge>}
            </h2>
            {unidades.length > 1 && <p className="text-[15px] text-muted-foreground">La que recoge primero, arriba</p>}
          </header>
  
          {unidades.map((v) => (
            <TarjetaUnidad key={v.id} viaje={v} porId={porId} destacada={v.id === primeraConPuesto?.id} />
          ))}
  
          {!conPuesto && (
            <Card className="items-center gap-3 rounded-3xl border-2 border-dashed px-5 text-center shadow-none ring-0">
              <span aria-hidden className="grid size-14 place-items-center rounded-full bg-muted">
                <BusIcon className="size-7 text-muted-foreground" />
              </span>
              <p className="text-lg font-bold">
                {unidades.length === 0 ? `Ahora no hay unidades ${haciaEnFrase(sentido)}` : "Todas van llenas por ahora"}
              </p>
              <p className="text-muted-foreground">Esta pantalla se actualiza sola: la unidad aparece aquí apenas salga.</p>
              {/* R60: si alguien dijo que vuelve, se dice aquí: es donde más ayuda */}
              <QuienVuelve choferes={enPausa} className="w-full border-t pt-3" />
            </Card>
          )}
        </section>
      )}
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
