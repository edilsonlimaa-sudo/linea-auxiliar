"use client"

import { CheckIcon, Loader2Icon, StarIcon } from "lucide-react"
import { useActionState, useId, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { calificarViaje, omitirCalificacion, type Resultado } from "@/lib/acciones/pasajero"
import type { CalificacionPendiente } from "@/lib/datos/inicio-pasajero"
import { cn } from "@/lib/utils"
import { SENTIDOS } from "@/lib/viajes"

const ETIQUETAS = ["Puntual", "Seguro", "Amable", "Respetó el orden", "Carro limpio"] as const
const SIGNIFICADO = ["", "Muy mal", "Mal", "Regular", "Bien", "Excelente"]

/**
 * "¿Cómo te fue con…?" al terminar el viaje (R45): un toque en las estrellas basta.
 * Etiquetas y comentario son opcionales; "Ahora no" lo deja para después.
 */
export function CalificarViaje({
  pendiente,
  desdeHistorial = false,
}: {
  pendiente: CalificacionPendiente
  desdeHistorial?: boolean // dentro de Mis viajes (R51): sin "Ahora no" y vuelve ahí al enviar
}) {
  const idComentario = useId()
  const [estrellas, setEstrellas] = useState(0)
  const [etiquetas, setEtiquetas] = useState<string[]>([])
  const [estado, enviar, enviando] = useActionState<Resultado, FormData>(calificarViaje, {})
  const [omitiendo, omitir] = useTransition()
  const nombre = pendiente.chofer.split(" ")[0]
  // En la página es el título principal; dentro de la hoja de Mis viajes, uno secundario
  const Titulo = desdeHistorial ? "h2" : "h1"

  return (
    <section
      aria-labelledby="titulo-calificar"
      className={cn("flex flex-col gap-5", !desdeHistorial && "rounded-3xl border-2 border-primary bg-card p-5 text-card-foreground shadow-sm")}
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[pendiente.sentido].largo} · Viaje terminado</p>
        <Titulo id="titulo-calificar" className="text-2xl leading-tight font-bold">
          ¿Cómo te fue con {nombre}?
        </Titulo>
        <p className="text-muted-foreground">Tu calificación ayuda a todos a escoger con confianza.</p>
      </div>

      <form action={enviar} className="flex flex-col gap-5">
        <input type="hidden" name="viaje" value={pendiente.viajeId} />
        <input type="hidden" name="chofer" value={pendiente.choferId} />
        {desdeHistorial && <input type="hidden" name="volver" value="mis-viajes" />}
        <input type="hidden" name="estrellas" value={estrellas || ""} />
        {etiquetas.map((e) => (
          <input key={e} type="hidden" name="etiquetas" value={e} />
        ))}

        <fieldset className="flex flex-col items-center gap-2">
          <legend className="sr-only">Estrellas</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer rounded-xl p-1 has-focus-visible:ring-[3px] has-focus-visible:ring-ring">
                <input type="radio" name="estrellas-opcion" checked={estrellas === n} onChange={() => setEstrellas(n)} className="sr-only" />
                <span className="sr-only">
                  {n} {n === 1 ? "estrella" : "estrellas"}: {SIGNIFICADO[n]}
                </span>
                <StarIcon aria-hidden className={cn("size-12", n <= estrellas ? "fill-signal text-signal" : "text-muted-foreground/50")} />
              </label>
            ))}
          </div>
          <p aria-live="polite" className="h-6 font-bold">
            {SIGNIFICADO[estrellas]}
          </p>
        </fieldset>

        {estrellas > 0 && (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-bold">
                ¿Qué destacas? <span className="font-normal text-muted-foreground">(opcional)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {ETIQUETAS.map((e) => {
                  const marcada = etiquetas.includes(e)
                  return (
                    <label
                      key={e}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 font-bold has-focus-visible:ring-[3px] has-focus-visible:ring-ring",
                        marcada ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => setEtiquetas((l) => (marcada ? l.filter((x) => x !== e) : [...l, e]))}
                        className="sr-only"
                      />
                      {marcada && <CheckIcon aria-hidden className="size-4" />}
                      {e}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idComentario} className="font-bold">
                Comentario <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <textarea
                id={idComentario}
                name="comentario"
                maxLength={140}
                rows={3}
                className="w-full rounded-lg border-2 border-input bg-card px-4 py-3 text-lg outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/60"
              />
            </div>
          </>
        )}

        {(estado.error || (estrellas === 0 && estado.intento)) && (
          <p role="alert" className="font-bold text-destructive">
            {estado.error ?? "Toca las estrellas para calificar."}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button type="submit" variant="signal" size="lg" className="w-full" disabled={enviando || omitiendo || estrellas === 0}>
            {enviando && <Loader2Icon aria-hidden className="animate-spin" />}
            {estrellas === 0 ? "Toca las estrellas" : "Enviar calificación"}
          </Button>
          {!desdeHistorial && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={enviando || omitiendo}
              onClick={() => omitir(async () => void (await omitirCalificacion(pendiente.reservaId)))}
            >
              {omitiendo && <Loader2Icon aria-hidden className="animate-spin" />}
              Ahora no
            </Button>
          )}
        </div>
      </form>
    </section>
  )
}
