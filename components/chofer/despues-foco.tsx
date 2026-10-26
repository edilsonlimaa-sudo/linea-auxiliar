"use client"

import { CoffeeIcon, FlagIcon, RepeatIcon, XIcon } from "lucide-react"
import Link from "next/link"

import { marcarAhoraNo, useAhoraNo } from "@/components/chofer/ahora-no"
import { BotonTerminar } from "@/components/chofer/boton-terminar"
import { buttonVariants } from "@/components/ui/button"
import { textoVuelta } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { contrario, SENTIDOS, type Viaje } from "@/lib/viajes"

// La hoja "¿Qué haces después?" (PreguntarVuelta) llega abierta por ?vuelta=1, con la respuesta ya escogida en &r=
const preguntar = (r?: "vuelta" | "pausa" | "ultimo") => `/inicio?vuelta=1${r ? `&r=${r}` : ""}`

const BARRA =
  "fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-2xl flex-col gap-2 border-t bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:border-x"

/**
 * En ruta sin próximo viaje (R75): qué hace después (R73), preguntado una sola vez. Sin responder, la pregunta con sus
 * tres respuestas y ✕ "Ahora no" (sin botón fijo); si ya dijo "ahora no" (aquí o cerrando la hoja), nada. Con pausa o
 * último, lo que avisó (Cambiar, Publicar mi vuelta) y el botón fijo "Terminar viaje", lo único que queda.
 */
export function DespuesFoco({ viaje }: { viaje: Pick<Viaje, "id" | "sentido" | "despues" | "despues_vuelve_en" | "estado_en" | "salida_en"> }) {
  const regreso = SENTIDOS[contrario(viaje.sentido)]
  const avisado = viaje.despues === "pausa" || viaje.despues === "ultimo"
  const ahoraNo = useAhoraNo(viaje.id)

  if (avisado) {
    const Icono = viaje.despues === "pausa" ? CoffeeIcon : FlagIcon
    return (
      <>
        <section aria-labelledby="titulo-despues" className="flex flex-col gap-3 rounded-2xl border-2 border-primary bg-card p-4">
          <h2 id="titulo-despues" className="flex items-center gap-2 text-lg leading-tight font-bold">
            <Icono aria-hidden className="size-5 text-primary" />
            {viaje.despues === "pausa" ? "Después: pausa" : "Es tu último viaje de hoy"}
          </h2>
          <p className="text-muted-foreground">
            {viaje.despues === "pausa"
              ? `${textoVuelta(viaje.despues_vuelve_en).replace(/^vuelve/, "Vuelves")}. Al terminar este viaje quedas desconectado hasta que vuelvas.`
              : "Al terminar este viaje quedas desconectado y la gente ve que terminaste por hoy."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link href={preguntar()} scroll={false} className={buttonVariants({ variant: "outline" })}>
              Cambiar
            </Link>
            <Link href={preguntar("vuelta")} scroll={false} className={buttonVariants({ variant: "outline" })}>
              <RepeatIcon aria-hidden />
              Publicar mi vuelta
            </Link>
          </div>
        </section>
        <div className={BARRA}>
          <BotonTerminar viajeId={viaje.id} salioEn={viaje.salida_en ?? viaje.estado_en} destino={regreso.enRecogida} sinVuelta />
          <p className="text-center text-sm text-muted-foreground">Termínalo al dejar al último pasajero.</p>
        </div>
      </>
    )
  }

  // Ya dijo "ahora no": no se vuelve a preguntar en este viaje (R73)
  if (ahoraNo) return null

  const opciones = [
    { r: "vuelta" as const, Icono: RepeatIcon, texto: "Sigo trabajando: publico mi vuelta" },
    { r: "pausa" as const, Icono: CoffeeIcon, texto: "Hago una pausa" },
    { r: "ultimo" as const, Icono: FlagIcon, texto: "Es mi último viaje de hoy" },
  ]
  return (
    <section aria-labelledby="titulo-despues" className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="titulo-despues" className="text-lg leading-tight font-bold">
            ¿Qué haces después de este viaje?
          </h2>
          <p className="text-muted-foreground">Si quieres, avísalo: así quien espera {regreso.enRecogida} sabe si vuelves.</p>
        </div>
        <button
          type="button"
          onClick={() => marcarAhoraNo(viaje.id)}
          className="flex min-h-10 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-bold text-muted-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <XIcon aria-hidden className="size-4" />
          Ahora no
        </button>
      </div>
      {opciones.map(({ r, Icono, texto }) => (
        <Link
          key={r}
          href={preguntar(r)}
          scroll={false}
          className={cn(buttonVariants({ variant: "outline" }), "h-auto min-h-12 justify-start whitespace-normal text-left")}
        >
          <Icono aria-hidden className="text-primary" />
          {texto}
        </Link>
      ))}
    </section>
  )
}
