"use client"

import { BellRingIcon, FlagIcon, Loader2Icon, MapPinCheckIcon, MessageCircleIcon, PlayIcon, TriangleAlertIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { Confirmar } from "@/components/confirmar"
import { Button, buttonVariants } from "@/components/ui/button"
import { avanzarViaje } from "@/lib/acciones/chofer"
import type { EstadoViaje } from "@/lib/viajes"

const MIN_EN_RUTA = 10 // antes de esto, Terminar viaje pide confirmación (R71)

/**
 * La acción principal del chofer, fija abajo (zona del pulgar) y siempre a la vista aunque baje a los próximos
 * viajes (por eso `fixed` y no `sticky`; la página deja espacio debajo). Una sola por estado:
 * en camino → Avisar que llego · llegando → Ya llegué · recogiendo → Salir con N · en ruta → Terminar viaje (confirmado si
 * salió hace menos de 10 min, R71).
 */
export function BarraAccion({
  viajeId,
  estado,
  confirmados,
  sinLlegar,
  enCamino = [],
  avisoSalida = null,
  mensajeGrupo,
  fija = true,
  salioEn,
  destino,
  sinVuelta = false,
}: {
  viajeId: string
  estado: EstadoViaje
  confirmados: number // personas que suben (con los acompañantes de cada grupo, R57)
  sinLlegar: string[] // confirmados con app que no han tocado "Ya estoy en el sitio"
  enCamino?: string[] // Centro → Valle Grande: a quién recoge en el camino al salir ("Carla P. (Plaza del Indio)")
  avisoSalida?: string | null // Centro → Valle Grande: nadie marcado Subió, o alguien dice que se montó (R66)
  mensajeGrupo: string // R15
  fija?: boolean // pegada abajo (viaje en foco) o dentro de la tarjeta
  salioEn?: string // en ruta: cuándo salió (estado_en), para no terminar a los pocos minutos (R71)
  destino?: string // en ruta: dónde deja a la gente, en frase ("en Valle Grande")
  sinVuelta?: boolean // en ruta sin otro viaje publicado: se aclara que no hace falta terminar para publicarla (R71)
}) {
  const router = useRouter()
  const { ejecutar, pendiente, error } = useAccion()
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const [haceMin, setHaceMin] = useState<number | null>(null) // Terminar antes de tiempo: minutos desde que salió
  const avanzar = (a: EstadoViaje, alTerminar?: () => void) => ejecutar(() => avanzarViaje(viajeId, a), alTerminar)
  const icono = pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : null

  let principal: React.ReactNode = null
  let secundaria: React.ReactNode = null
  if (estado === "en_camino") {
    principal = (
      <Button variant="signal" size="lg" className="w-full" disabled={pendiente} onClick={() => avanzar("llegando")}>
        {icono ?? <BellRingIcon aria-hidden />}
        Avisar que llego en 3 min
      </Button>
    )
    secundaria = (
      <Button variant="outline" className="w-full" disabled={pendiente} onClick={() => avanzar("en_parada")}>
        <MapPinCheckIcon aria-hidden />
        Ya llegué
      </Button>
    )
  } else if (estado === "llegando") {
    principal = (
      <Button variant="signal" size="lg" className="w-full" disabled={pendiente} onClick={() => avanzar("en_parada")}>
        {icono ?? <MapPinCheckIcon aria-hidden />}
        Ya llegué
      </Button>
    )
    secundaria = (
      <a
        href={`https://wa.me/?text=${encodeURIComponent(mensajeGrupo)}`}
        target="_blank"
        rel="noreferrer"
        className={buttonVariants({ variant: "whatsapp", className: "w-full" })}
      >
        <MessageCircleIcon aria-hidden />
        Avisar también al grupo de WhatsApp
      </a>
    )
  } else if (estado === "en_parada") {
    principal = (
      <Button variant="signal" size="lg" className="w-full" disabled={pendiente} onClick={() => setConfirmarSalida(true)}>
        <PlayIcon aria-hidden />
        {confirmados === 0 ? "Salir sin pasajeros" : confirmados === 1 ? "Salir con 1 pasajero" : `Salir con ${confirmados} pasajeros`}
      </Button>
    )
  } else if (estado === "en_ruta") {
    // R71: terminar a los pocos minutos de salir casi siempre es un toque sin querer o para publicar la vuelta
    const terminar = () => {
      const min = salioEn ? (Date.now() - new Date(salioEn).getTime()) / 60_000 : Infinity
      if (min < MIN_EN_RUTA) setHaceMin(Math.max(0, Math.floor(min)))
      else avanzar("finalizado")
    }
    principal = (
      <Button variant="signal" size="lg" className="w-full" disabled={pendiente} onClick={terminar}>
        {icono ?? <FlagIcon aria-hidden />}
        Terminar viaje
      </Button>
    )
    secundaria = (
      <p className="text-center text-sm text-muted-foreground">
        {sinVuelta ? "No hace falta terminar para publicar tu vuelta: este" : "Este"} viaje se termina solo al tocar Ya llegué
        en tu próxima recogida.
      </p>
    )
  }
  if (!principal) return null

  return (
    <div
      className={
        fija
          ? "fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-2xl flex-col gap-2 border-t bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:border-x"
          : "flex flex-col gap-2"
      }
    >
      {error && !confirmarSalida && haceMin === null && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      {principal}
      {secundaria}
      <Confirmar
        abierto={confirmarSalida}
        onCambiar={setConfirmarSalida}
        titulo={confirmados === 1 ? "¿Salir con 1 pasajero?" : `¿Salir con ${confirmados} pasajeros?`}
        descripcion={
          <>
            Al salir se cierra la lista.
            {sinLlegar.length > 0 && (
              <strong className="mt-2 block text-foreground">
                {sinLlegar.length === 1
                  ? `${sinLlegar[0]} no ha avisado que está en el sitio.`
                  : `${sinLlegar.join(", ")} no han avisado que están en el sitio.`}
              </strong>
            )}
            {avisoSalida && (
              <strong className="mt-2 flex items-start gap-2 rounded-xl bg-warning-muted px-3 py-2 text-foreground">
                <TriangleAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
                {avisoSalida}
              </strong>
            )}
            {enCamino.length > 0 && (
              <strong className="mt-2 block text-foreground">En el camino recoges a {enCamino.join(", ")}.</strong>
            )}
          </>
        }
        confirmar="Sí, salir"
        variante="signal"
        cancelar="Esperar un poco más"
        ocupado={pendiente}
        error={error}
        // R61: ya en ruta, Inicio pregunta por la vuelta (si no tiene otro viaje publicado)
        onConfirmar={() => avanzar("en_ruta", () => (setConfirmarSalida(false), router.replace("/inicio?vuelta=1", { scroll: false })))}
      />
      <Confirmar
        abierto={haceMin !== null}
        onCambiar={(v) => !v && setHaceMin(null)}
        titulo={haceMin === 0 ? "Acabas de salir" : `Saliste hace ${haceMin === 1 ? "1 minuto" : `${haceMin} minutos`}`}
        descripcion={
          <>
            ¿Ya dejaste a todos{destino ? ` ${destino}` : ""}? Al terminar, tus pasajeros ven que llegaron y tú quedas libre.
            {sinVuelta && (
              <strong className="mt-2 block text-foreground">
                Para publicar tu vuelta no hace falta terminar: usa «Agregar otro viaje».
              </strong>
            )}
          </>
        }
        confirmar="Sí, terminar"
        variante="signal"
        cancelar="No, sigo en ruta"
        destacarCancelar // R71: lo normal a los pocos minutos es seguir en ruta
        ocupado={pendiente}
        error={error}
        onConfirmar={() => avanzar("finalizado", () => setHaceMin(null))}
      />
    </div>
  )
}
