"use client"

import { CheckCircle2Icon, Loader2Icon, StarIcon, XIcon } from "lucide-react"
import { useCallback, useId, useState, useSyncExternalStore, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { valorarApp } from "@/lib/acciones/sugerencias"
import { cn } from "@/lib/utils"

// "Ahora no" la esconde 14 días en este teléfono (R82)
const CLAVE = "linea-auxiliar:valorar-app-hasta"
const EVENTO = "valorar-app"
const ESCONDER_MS = 14 * 86_400_000
const leerHasta = () => {
  try {
    return Number(localStorage.getItem(CLAVE) ?? 0)
  } catch {
    return 0
  }
}

/**
 * "¿Qué tal la app?" (R82): estrellas y un comentario opcional, en un momento bueno (al calificar un buen viaje, o el
 * chofer en Inicio sin viajes). Quién la ve lo decide la base; aquí solo "Ahora no" (14 días) y el gracias.
 */
export function ValorarApp() {
  const id = useId()
  const [estrellas, setEstrellas] = useState(0)
  const [comentario, setComentario] = useState("")
  const [enviada, setEnviada] = useState(false)
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()
  const suscribir = useCallback((avisar: () => void) => {
    window.addEventListener(EVENTO, avisar)
    return () => window.removeEventListener(EVENTO, avisar)
  }, [])
  // En el servidor no se muestra (decide el teléfono si está escondida)
  const hasta = useSyncExternalStore(suscribir, leerHasta, () => Number.POSITIVE_INFINITY)
  const [ahora] = useState(() => Date.now())

  if (!enviada && hasta > ahora) return null

  const ahoraNo = () => {
    try {
      localStorage.setItem(CLAVE, String(Date.now() + ESCONDER_MS))
    } catch {}
    window.dispatchEvent(new Event(EVENTO))
  }
  const enviar = () =>
    iniciar(async () => {
      const r = await valorarApp(estrellas, comentario)
      setError(r.error)
      if (!r.error) setEnviada(true)
    })

  if (enviada) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-2xl bg-success-muted px-4 py-3 font-bold text-success">
        <CheckCircle2Icon aria-hidden className="size-5 shrink-0" />
        ¡Gracias por tu opinión!
      </p>
    )
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-titulo`} className="text-base leading-tight font-bold">
            ¿Qué tal te parece la app?
          </h2>
          <p className="text-sm text-muted-foreground">Nos ayuda a mejorarla. Un toque basta.</p>
        </div>
        <button
          type="button"
          onClick={ahoraNo}
          className="flex min-h-10 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-bold text-muted-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <XIcon aria-hidden className="size-4" />
          Ahora no
        </button>
      </div>
      <fieldset className="flex justify-center gap-1">
        <legend className="sr-only">Estrellas para la app</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded-xl p-1 has-focus-visible:ring-[3px] has-focus-visible:ring-ring">
            <input type="radio" name={`${id}-estrellas`} checked={estrellas === n} onChange={() => setEstrellas(n)} className="sr-only" />
            <span className="sr-only">{n === 1 ? "1 estrella" : `${n} estrellas`}</span>
            <StarIcon aria-hidden className={cn("size-9", n <= estrellas ? "fill-signal text-signal" : "text-muted-foreground/50")} />
          </label>
        ))}
      </fieldset>
      {estrellas > 0 && (
        <>
          <label htmlFor={`${id}-comentario`} className="text-sm font-bold">
            {estrellas <= 3 ? "¿Qué te molesta? (opcional)" : "¿Algo que mejorar? (opcional)"}
          </label>
          <textarea
            id={`${id}-comentario`}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={1000}
            rows={2}
            className="w-full rounded-lg border-2 border-input bg-card px-4 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/60"
          />
          {error && (
            <p role="alert" className="font-bold text-destructive">
              {error}
            </p>
          )}
          <Button onClick={enviar} disabled={pendiente} className="w-full">
            {pendiente && <Loader2Icon aria-hidden className="animate-spin" />}
            Enviar
          </Button>
        </>
      )}
    </section>
  )
}
