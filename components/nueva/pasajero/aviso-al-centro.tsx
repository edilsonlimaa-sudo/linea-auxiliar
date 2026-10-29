"use client"

import { BellRing, Loader2, X } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { pedirAvisoAlCentro } from "@/lib/acciones/pasajero"
import { pedirPermisoSiFalta } from "@/lib/avisos-celular"

type Props = {
  // El pedido vigente (hasta = "3:40 p. m.", escrito en el servidor); avisada = ya le llegó el aviso de un carro
  pedido: { hasta: string; avisada: boolean } | null
}

// Cerrada con ✕, no vuelve a salir en este celular por 12 h
const CERRADA = "aviso-centro-cerrado"
const CERRADA_MS = 12 * 3_600_000

/**
 * R94, en Al Centro cuando no hay carro con puesto: una línea discreta "¿Te avisamos cuando salga un carro?" con Avísame
 * (la Línea fija el tiempo: 2 horas) y ✕ para cerrarla. El aviso llega una sola vez; con el pedido vigente, solo lo
 * dice (sin botón: pedido es pedido). Si el celular nunca respondió al permiso de avisos, se pide en el mismo toque; si los rechazó, lleva a
 * activarlos (sin ellos, lo ve al abrir la app).
 */
export function AvisoAlCentro({ pedido }: Props) {
  const [error, setError] = React.useState<string>()
  const [pendiente, iniciar] = React.useTransition()
  const [sinAvisos, setSinAvisos] = React.useState(false)
  // null hasta leer el celular: así no aparece y desaparece al cargar
  const [cerrada, setCerrada] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el permiso y lo guardado solo se saben en el navegador
    setSinAvisos(!("Notification" in window) || Notification.permission !== "granted")
    let desde = 0
    try {
      desde = Number(localStorage.getItem(CERRADA) ?? 0)
    } catch {}
    setCerrada(Date.now() - desde < CERRADA_MS)
  }, [])

  const pedir = () =>
    iniciar(async () => {
      setError(undefined)
      // Quien pide un aviso quiere que le llegue: si este celular nunca respondió al permiso, se pide ahora (mismo toque)
      const permiso = await pedirPermisoSiFalta().catch(() => null)
      if (permiso) setSinAvisos(permiso !== "activo")
      const r = await pedirAvisoAlCentro()
      if (r.error) setError(r.error)
    })
  const cerrar = () => {
    try {
      localStorage.setItem(CERRADA, String(Date.now()))
    } catch {}
    setCerrada(true)
  }

  const esperando = pedido && !pedido.avisada
  // Con un pedido vigente siempre se ve (confirma que quedó pedido); sin pedido, respeta la ✕
  if (!esperando && cerrada !== false) return null

  return (
    <section aria-label="Aviso cuando salga un carro" className="flex flex-col gap-2 rounded-2xl border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {pendiente ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <BellRing aria-hidden className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {esperando ? "Te avisamos si sale un carro" : pedido?.avisada ? "Ese carro ya no tiene puesto" : "¿Te avisamos cuando salga un carro?"}
          </p>
          <p className="text-xs text-muted-foreground">
            {esperando ? `Hasta las ${pedido.hasta} · una sola vez` : pedido?.avisada ? "¿Te avisamos del próximo?" : "Por las próximas 2 horas, una sola vez"}
          </p>
        </div>
        {esperando ? null : (
          <>
            <Button size="sm" disabled={pendiente} onClick={pedir}>
              Avísame
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Cerrar" disabled={pendiente} onClick={cerrar} className="-mr-1 text-muted-foreground">
              <X />
            </Button>
          </>
        )}
      </div>
      {esperando && sinAvisos ? (
        <p className="text-xs text-muted-foreground">
          Para que te llegue con la app cerrada,{" "}
          <Link href="/n/notificaciones" className="font-semibold text-primary underline-offset-4 hover:underline">
            activa los avisos en el celular
          </Link>
          .
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
