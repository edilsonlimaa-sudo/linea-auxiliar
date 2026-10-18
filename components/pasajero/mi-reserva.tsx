import { ChevronDownIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from "lucide-react"

import { BotonYaLlegue, BotonYaNoVoy } from "@/components/pasajero/acciones-reserva"
import { ChoferResumen } from "@/components/pasajero/chofer-resumen"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { buttonVariants } from "@/components/ui/button"
import type { MiReserva } from "@/lib/datos/inicio-pasajero"
import { cn } from "@/lib/utils"
import { llegada, SENTIDOS, tienePuesto, type EstadoViaje, type Viaje } from "@/lib/viajes"

const PASOS = ["Apartado", "En camino", "Recogiendo", "En ruta"] as const
const PASO_DE: Record<EstadoViaje, number> = {
  programado: 0,
  en_camino: 1,
  llegando: 2,
  en_parada: 2,
  en_ruta: 3,
  finalizado: 3,
  cancelado: 0,
}

/**
 * Avance del viaje: barras para verlo de un vistazo y una sola etiqueta legible (cuatro etiquetas no caben
 * en un celular con letra grande).
 */
function PasosViaje({ estado }: { estado: EstadoViaje }) {
  const actual = PASO_DE[estado]
  const siguiente = PASOS[actual + 1]
  return (
    <div className="flex flex-col gap-2">
      <ol className="grid grid-cols-4 gap-1.5" aria-label="Avance del viaje">
        {PASOS.map((paso, i) => (
          <li key={paso} aria-current={i === actual ? "step" : undefined} className={cn("h-2.5 rounded-full", i <= actual ? "bg-primary" : "bg-muted")}>
            <span className="sr-only">
              {paso}
              {i < actual ? " (listo)" : i === actual ? " (ahora)" : ""}
            </span>
          </li>
        ))}
      </ol>
      <p aria-hidden className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-bold">
          Paso {actual + 1} de {PASOS.length}: {PASOS[actual]}
        </span>
        {siguiente && <span className="text-[15px] text-muted-foreground">Después: {siguiente}</span>}
      </p>
    </div>
  )
}

/**
 * "Tu viaje": todo lo que el pasajero necesita mientras espera el carro, en orden de importancia:
 * ¿tengo puesto? → ¿cuándo llega? → ¿dónde? → ¿quién? → acciones.
 */
export function MiReservaTarjeta({
  datos,
  porId,
  cambiarme,
}: {
  datos: MiReserva
  porId: Map<string, Viaje>
  cambiarme?: React.ReactNode // en lista de espera: botón para cambiarse de unidad (R22), justo bajo el estado
}) {
  const { reserva, viaje, posicion, lista, telefonoChofer } = datos
  const confirmado = tienePuesto(posicion, viaje)
  const aBordo = reserva.estado === "subio" // el carro ya salió con la persona adentro
  const turno = posicion - viaje.puestos
  const cuando = llegada(viaje, porId)
  const lugar = reserva.lugar ?? (reserva.lat !== null ? "tu ubicación GPS" : "sin lugar")
  const telefono = telefonoChofer?.replace(/\D/g, "")
  const mensaje = encodeURIComponent(`Hola, soy pasajero de la Línea Auxiliar. Aparté puesto en tu carro (${SENTIDOS[viaje.sentido].largo}).`)

  let titulo: string
  let subtitulo: string
  if (aBordo) {
    titulo = "Vas a bordo"
    subtitulo = `Al llegar podrás contar cómo te fue con ${viaje.chofer.nombre.split(" ")[0]}.`
  } else if (reserva.pendiente) {
    titulo = "Esperando respuesta del chofer"
    subtitulo = "Le pediste que te recoja en el camino. Te avisamos si va por ti."
  } else if (confirmado) {
    titulo = `Tienes el puesto ${posicion} de ${viaje.puestos}`
    subtitulo = reserva.aceptada_en ? "El chofer va por ti." : "Tu puesto está apartado."
  } else {
    titulo = turno === 1 ? "Eres el próximo en la lista de espera" : `Estás de ${turno} en la lista de espera`
    subtitulo = cambiarme ? "Si alguien libera su puesto, subes solo. O cámbiate a una unidad con puesto:" : "Si alguien libera su puesto, subes solo."
  }

  return (
    <section aria-labelledby="titulo-mi-viaje" className="flex flex-col gap-5 rounded-3xl border-2 border-primary bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[viaje.sentido].largo}</p>
        <h2 id="titulo-mi-viaje" className={cn("text-2xl leading-tight font-bold", confirmado && !reserva.pendiente ? "text-success" : "text-foreground")}>
          {titulo}
        </h2>
        <p className="text-muted-foreground">{subtitulo}</p>
        {cambiarme && <div className="mt-2">{cambiarme}</div>}
      </div>

      <div className="rounded-2xl bg-secondary p-4 text-secondary-foreground">
        {aBordo ? (
          <p className="text-xl leading-tight font-bold">En ruta {SENTIDOS[viaje.sentido].hacia}</p>
        ) : (
          <>
            <p className="text-xl leading-tight font-bold">{cuando.principal}</p>
            {cuando.detalle && <p className="text-[15px] opacity-85">{cuando.detalle}</p>}
            <p className="mt-2 flex items-start gap-1.5">
              <MapPinIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
              <span>
                Te recoge en <strong>{lugar}</strong>
              </span>
            </p>
          </>
        )}
      </div>

      {/* Mientras viene a buscarlo: por dónde viene el carro (R41). A bordo ya no hace falta */}
      {!aBordo && (
        <VerEnMapa
          choferId={viaje.chofer_id}
          chofer={viaje.chofer.nombre}
          yo={reserva.lat !== null && reserva.lng !== null ? { lat: reserva.lat, lng: reserva.lng } : null}
        />
      )}

      <PasosViaje estado={viaje.estado} />

      {confirmado && !reserva.pendiente && viaje.estado !== "en_ruta" && <BotonYaLlegue reservaId={reserva.id} listo={reserva.listo} />}

      <ChoferResumen chofer={viaje.chofer} />

      {telefono && (
        <div className="grid grid-cols-2 gap-2.5">
          <a href={`tel:+${telefono}`} className={buttonVariants({ variant: "outline" })}>
            <PhoneIcon aria-hidden />
            Llamar
          </a>
          <a href={`https://wa.me/${telefono}?text=${mensaje}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "whatsapp" })}>
            <MessageCircleIcon aria-hidden />
            WhatsApp
          </a>
        </div>
      )}

      {lista.length > 0 && (
        <details className="group rounded-2xl border-2">
          <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-2 px-4 font-bold [&::-webkit-details-marker]:hidden">
            Ver la lista del carro ({lista.length})
            <ChevronDownIcon aria-hidden className="size-5 transition-transform group-open:rotate-180" />
          </summary>
          <ol className="flex flex-col gap-1 px-2 pb-3">
            {lista.map((f) => (
              <li
                key={f.posicion}
                className={cn("flex items-center gap-3 rounded-xl px-2 py-2", f.es_mio && "bg-signal/20 font-bold")}
              >
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold", f.confirmado ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {f.posicion}
                </span>
                <span className="flex-1">
                  {f.nombre_corto}
                  {f.es_mio && " (tú)"}
                </span>
                <span className="text-sm text-muted-foreground">{f.confirmado ? (f.listo ? "Ya está en el sitio" : "Con puesto") : "En espera"}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      {(viaje.estado !== "en_ruta" || reserva.pendiente) && <BotonYaNoVoy reservaId={reserva.id} confirmado={confirmado} chofer={viaje.chofer.nombre} />}
    </section>
  )
}
