"use client"

import { BellRing, Check, Loader2 } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { pedirAvisoAlCentro } from "@/lib/acciones/pasajero"
import { pedirPermisoSiFalta } from "@/lib/avisos-celular"

type Props = {
  // El pedido vigente; avisada = ya le llegó el aviso de un carro
  pedido: { avisada: boolean } | null
}

/**
 * R94, abajo de Al Centro cuando no hay carro con puesto (como "Anotarme en la lista"): el botón "Avísame cuando salga un
 * carro" (la Línea fija el tiempo: 2 horas). El aviso llega una sola vez. Pedido es pedido: tras el toque, un "Listo, te
 * avisamos" breve y el botón desaparece. Si el celular nunca respondió al permiso de avisos, se pide en el mismo toque (sin
 * avisos, lo ve al abrir la app).
 */
export function AvisoAlCentro({ pedido }: Props) {
  const [error, setError] = React.useState<string>()
  const [pendiente, iniciar] = React.useTransition()
  // Recién pedido: confirma un momento y desaparece
  const [listo, setListo] = React.useState(false)

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

  if (listo) {
    return (
      <p role="status" className="flex h-11 items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <Check aria-hidden className="size-4 text-primary" />
        Listo, te avisamos
      </p>
    )
  }
  if (pedido && !pedido.avisada) return null

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" disabled={pendiente} onClick={pedir}>
        {pendiente ? <Loader2 className="animate-spin" /> : <BellRing />}
        {pedido?.avisada ? "Avísame del próximo carro" : "Avísame cuando salga un carro"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {pedido?.avisada ? "El carro que te avisamos ya se llenó. " : ""}Por las próximas 2 horas, una sola vez.
      </p>
      {error ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
