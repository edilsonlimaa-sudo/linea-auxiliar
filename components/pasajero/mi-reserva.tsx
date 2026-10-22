import { ChevronDownIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from "lucide-react"

import { BotonYaLlegue, BotonYaNoVoy } from "@/components/pasajero/acciones-reserva"
import { CambiarLugar } from "@/components/pasajero/cambiar-lugar"
import { ChoferResumen, DetalleCarro, FotoCarro } from "@/components/pasajero/chofer-resumen"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { buttonVariants } from "@/components/ui/button"
import type { MiReserva } from "@/lib/datos/inicio-pasajero"
import { cn } from "@/lib/utils"
import { conAcompanantes, llegada, SENTIDOS, textoPersonas, tienePuesto, type EstadoViaje, type Viaje } from "@/lib/viajes"

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
 * Avance del viaje: barras para verlo de un vistazo y una sola etiqueta legible, en una línea (cuatro etiquetas no
 * caben en un celular con letra grande).
 */
function PasosViaje({ estado }: { estado: EstadoViaje }) {
  const actual = PASO_DE[estado]
  return (
    <div className="flex flex-col gap-1.5">
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
      <p aria-hidden className="text-sm">
        <span className="font-bold">
          Paso {actual + 1} de {PASOS.length}: {PASOS[actual]}
        </span>
      </p>
    </div>
  )
}

/**
 * "Tu viaje": todo lo que el pasajero necesita mientras espera el carro, en orden de importancia y compacto para que
 * quepa en la pantalla (§8): ¿tengo puesto? → ¿cuándo llega y dónde? → ¿quién? (con el mapa) → acciones. La foto del
 * carro y la lista, a pedido.
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
  const { reserva, viaje, desde, hasta, turno, lista, telefonoChofer } = datos
  const confirmado = tienePuesto(hasta, viaje)
  // Ya subió: con el carro en ruta o, en la lista hacia Valle Grande, todavía en Gina (R64). No se desiste: lo baja el chofer
  const aBordo = reserva.estado === "subio"
  const grupo = reserva.personas > 1 // viaja acompañado (R57)
  // Lista de Gina: esperaba en el camino y el carro salió de Gina con su puesto guardado (R66)
  const vaPorTi = viaje.sentido === "centro_a_vg" && viaje.estado === "en_ruta" && reserva.estado === "activa" && !reserva.pendiente
  const cuando = llegada(viaje, porId)
  const lugar = reserva.lugar ?? (reserva.lat !== null ? "tu ubicación GPS" : "sin lugar")
  const telefono = telefonoChofer?.replace(/\D/g, "")
  const mensaje = encodeURIComponent(`Hola, soy pasajero de la Línea Auxiliar. Aparté puesto en tu carro (${SENTIDOS[viaje.sentido].largo}).`)

  let titulo: string
  let subtitulo: string
  if (aBordo) {
    titulo = grupo ? "Van a bordo" : "Vas a bordo"
    subtitulo = `Al llegar podrás contar cómo te fue con ${viaje.chofer.nombre.split(" ")[0]}.`
  } else if (reserva.pendiente) {
    titulo = "Esperando respuesta del chofer"
    subtitulo = "Le pediste que te recoja en el camino. Te avisamos si va por ti."
  } else if (vaPorTi) {
    titulo = `${viaje.chofer.nombre.split(" ")[0]} va por ti`
    subtitulo = `Ya salió de Gina con ${grupo ? "sus puestos" : "tu puesto"}. Te recoge al pasar por ${reserva.lugar ?? "donde estás"}.`
  } else if (confirmado) {
    titulo = grupo ? `Tienen los puestos ${desde} a ${hasta} de ${viaje.puestos}` : `Tienes el puesto ${hasta} de ${viaje.puestos}`
    subtitulo = reserva.aceptada_en
      ? "El chofer va por ti."
      : grupo
        ? `Apartaste para ${textoPersonas(reserva.personas)}: van juntos.`
        : "Tu puesto está apartado."
  } else {
    titulo = turno === 1 ? "Eres el próximo en la lista de espera" : `Estás de ${turno} en la lista de espera`
    subtitulo = cambiarme ? "Si alguien libera su puesto, subes solo. O cámbiate a una unidad con puesto:" : "Si alguien libera su puesto, subes solo."
  }

  // A pedido: la foto del carro (mientras viene, para reconocerlo, R54) y la lista del carro
  const v = viaje.chofer.vehiculo
  const conFoto = !aBordo && Boolean(v?.fotoUrl)
  const conCarro = conFoto || Boolean(v?.modelo || v?.color || v?.aire_acondicionado)
  const masTitulo = [conCarro && "el carro", lista.length > 0 && `la lista (${lista.length})`].filter(Boolean).join(" y ")

  return (
    <section aria-labelledby="titulo-mi-viaje" className="flex flex-col gap-4 rounded-2xl border-2 border-primary bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[viaje.sentido].largo}</p>
        <h2 id="titulo-mi-viaje" className={cn("text-lg leading-tight font-bold", confirmado && !reserva.pendiente ? "text-success" : "text-foreground")}>
          {titulo}
        </h2>
        <p className="text-muted-foreground">{subtitulo}</p>
        {cambiarme && <div className="mt-2">{cambiarme}</div>}
      </div>

      {/* Cuándo llega y dónde, en un solo bloque; "Cambiar" al lado del lugar */}
      <div className="rounded-2xl bg-secondary px-4 py-3 text-secondary-foreground">
        {aBordo ? (
          <p className="text-base leading-tight font-bold">En ruta {SENTIDOS[viaje.sentido].hacia}</p>
        ) : (
          <>
            <p className="text-base leading-tight font-bold">{cuando.principal}</p>
            {cuando.detalle && <p className="text-sm opacity-85">{cuando.detalle}</p>}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="flex min-w-0 items-start gap-1.5">
                <MapPinIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
                <span>
                  Te recoge en <strong>{lugar}</strong>
                </span>
              </p>
              {reserva.estado === "activa" && <CambiarLugar reservaId={reserva.id} lugarActual={reserva.lugar} compacto />}
            </div>
          </>
        )}
      </div>

      {confirmado && !aBordo && !reserva.pendiente && viaje.estado !== "en_ruta" && <BotonYaLlegue reservaId={reserva.id} listo={reserva.listo} />}

      {/* El chofer en una línea; el mapa en vivo (R41), como ícono mientras viene a buscarlo */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <ChoferResumen chofer={viaje.chofer} compacto />
        </div>
        {!aBordo && (
          <VerEnMapa
            choferId={viaje.chofer_id}
            chofer={viaje.chofer.nombre}
            yo={reserva.lat !== null && reserva.lng !== null ? { lat: reserva.lat, lng: reserva.lng } : null}
            compacto
          />
        )}
      </div>

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

      <PasosViaje estado={viaje.estado} />

      {masTitulo && (
        <details className="group rounded-2xl border-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 font-bold focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            Ver {masTitulo}
            <ChevronDownIcon aria-hidden className="size-5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 px-2 pt-1 pb-3">
            <DetalleCarro chofer={viaje.chofer} />
            {conFoto && <FotoCarro chofer={viaje.chofer} />}
            {lista.length > 0 && (
              <ol className="flex flex-col gap-1">
                {lista.map((f) => (
                  <li
                    key={f.posicion}
                    className={cn("flex items-center gap-3 rounded-xl px-2 py-2", f.es_mio && "bg-signal/20 font-bold")}
                  >
                    <span className={cn("grid h-8 min-w-8 shrink-0 place-items-center rounded-full px-1.5 text-sm font-bold", f.confirmado ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {f.personas > 1 ? `${f.desde}–${f.hasta}` : f.desde}
                    </span>
                    <span className="flex-1">
                      {conAcompanantes(f.nombre_corto ?? "Pasajero", f.personas)}
                      {f.es_mio && " (tú)"}
                    </span>
                    <span className="text-sm text-muted-foreground">{f.confirmado ? (f.listo ? "Ya está en el sitio" : "Con puesto") : "En espera"}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </details>
      )}

      {!aBordo && (viaje.estado !== "en_ruta" || reserva.pendiente || vaPorTi) && <BotonYaNoVoy reservaId={reserva.id} confirmado={confirmado} chofer={viaje.chofer.nombre} />}
    </section>
  )
}
