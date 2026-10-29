"use client"

import { BellRing, Check, Loader2, X } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { pedirAvisoAlCentro } from "@/lib/acciones/pasajero"
import { pedirPermisoSiFalta } from "@/lib/avisos-celular"

type Props = {
  // El pedido vigente; avisada = ya le llegó el aviso de un carro
  pedido: { avisada: boolean } | null
}

// Cerrada con ✕, no vuelve a salir en este celular por 12 h
const CERRADA = "aviso-centro-cerrado"
const CERRADA_MS = 12 * 3_600_000

/**
 * R94, en Al Centro cuando no hay carro con puesto: una línea discreta "¿Te avisamos cuando salga un carro?" con Avísame
 * (la Línea fija el tiempo: 2 horas) y ✕ para cerrarla. El aviso llega una sola vez. Pedido es pedido: tras
 * el toque, un "Listo, te avisamos" breve y la línea desaparece. Si el celular nunca respondió al permiso de avisos, se pide
 * en el mismo toque (sin avisos, lo ve al abrir la app).
 */
export function AvisoAlCentro({ pedido }: Props) {
  const [error, setError] = React.useState<string>()
  const [pendiente, iniciar] = React.useTransition()
  // Recién pedido: confirma un momento y desaparece
  const [listo, setListo] = React.useState(false)
  // null hasta leer el celular: así no aparece y desaparece al cargar
  const [cerrada, setCerrada] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    let desde = 0
    try {
      desde = Number(localStorage.getItem(CERRADA) ?? 0)
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lo guardado solo se sabe en el navegador
    setCerrada(Date.now() - desde < CERRADA_MS)
  }, [])

  React.useEffect(() => {
    if (!listo) return
    const t = setTimeout(() => setListo(false), 3000)
    return () => clearTimeout(t)
  }, [listo])

  const pedir = () =>
    iniciar(async () => {
      setError(undefined)
      // Quien pide un aviso quiere que le llegue: si este celular nunca respondió al permiso, se pide ahora (mismo toque)
      await pedirPermisoSiFalta().catch(() => null)
      const r = await pedirAvisoAlCentro()
      if (r.error) setError(r.error)
      else setListo(true)
    })
  const cerrar = () => {
    try {
      localStorage.setItem(CERRADA, String(Date.now()))
    } catch {}
    setCerrada(true)
  }

  const esperando = pedido && !pedido.avisada
  if (esperando || listo) {
    return listo ? (
      <p role="status" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <Check aria-hidden className="size-4 text-primary" />
        Listo, te avisamos
      </p>
    ) : null
  }
  if (cerrada !== false) return null

  return (
    <section aria-label="Aviso cuando salga un carro" className="flex flex-col gap-2 rounded-2xl border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {pendiente ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <BellRing aria-hidden className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {pedido?.avisada ? "Ese carro ya no tiene puesto" : "¿Te avisamos cuando salga un carro?"}
          </p>
          <p className="text-xs text-muted-foreground">
            {pedido?.avisada ? "¿Te avisamos del próximo?" : "Por las próximas 2 horas, una sola vez"}
          </p>
        </div>
        <Button size="sm" disabled={pendiente} onClick={pedir}>
          Avísame
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Cerrar" disabled={pendiente} onClick={cerrar} className="-mr-1 text-muted-foreground">
          <X />
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
