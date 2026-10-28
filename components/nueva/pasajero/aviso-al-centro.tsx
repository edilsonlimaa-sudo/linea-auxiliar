"use client"

import { BellRing, Loader2 } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { cancelarAvisoAlCentro, pedirAvisoAlCentro } from "@/lib/acciones/pasajero"
import { pedirPermisoSiFalta } from "@/lib/avisos-celular"

type Props = {
  // El pedido vigente (hasta = "3:40 p. m.", escrito en el servidor); avisada = ya le llegó el aviso de un carro
  pedido: { hasta: string; avisada: boolean } | null
}

/**
 * R94, en Al Centro cuando no hay carro con puesto: "Avisarme cuando haya un carro" por 1 h, 2 h o hasta una hora. El
 * aviso llega una sola vez; con el pedido vigente, lo dice y deja cancelarlo. Si el celular nunca respondió al permiso de
 * avisos, se pide en el mismo toque; si los rechazó, lleva a activarlos (sin ellos, lo ve al abrir la app).
 */
export function AvisoAlCentro({ pedido }: Props) {
  const [error, setError] = React.useState<string>()
  const [pendiente, iniciar] = React.useTransition()
  const [conHora, setConHora] = React.useState(false)
  const [hora, setHora] = React.useState("")
  const [sinAvisos, setSinAvisos] = React.useState(false)

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el permiso solo se sabe en el navegador
    setSinAvisos(!("Notification" in window) || Notification.permission !== "granted")
  }, [])

  const pedir = (hasta: { horas: number } | { hora: string }) =>
    iniciar(async () => {
      setError(undefined)
      // Quien pide un aviso quiere que le llegue: si este celular nunca respondió al permiso, se pide ahora (mismo toque)
      const permiso = await pedirPermisoSiFalta().catch(() => null)
      if (permiso) setSinAvisos(permiso !== "activo")
      const r = await pedirAvisoAlCentro(hasta)
      if (r.error) setError(r.error)
      else setConHora(false)
    })
  const cancelar = () =>
    iniciar(async () => {
      setError(undefined)
      const r = await cancelarAvisoAlCentro()
      if (r.error) setError(r.error)
    })

  const esperando = pedido && !pedido.avisada

  return (
    <section aria-labelledby="titulo-aviso-centro" className="flex flex-col gap-3 rounded-3xl border border-primary/30 bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {pendiente ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <BellRing aria-hidden className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 id="titulo-aviso-centro" className="font-heading font-semibold">
            {esperando
              ? "Te avisamos cuando haya un carro"
              : pedido?.avisada
                ? "Ya te avisamos de un carro, pero ya no tiene puesto"
                : "¿Te avisamos cuando haya un carro?"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {esperando
              ? `Hasta las ${pedido.hasta} · te llega una sola vez, con el primer carro al Centro que tenga puesto.`
              : "Te llega una sola vez, con el primer carro al Centro que tenga puesto. Escoge hasta cuándo:"}
          </p>
        </div>
      </div>

      {esperando ? (
        <div className="flex flex-col gap-2">
          {sinAvisos ? (
            <p className="rounded-2xl bg-muted px-3 py-2 text-sm">
              Para que te llegue con la app cerrada,{" "}
              <Link href="/n/notificaciones" className="font-semibold text-primary underline-offset-4 hover:underline">
                activa los avisos en el celular
              </Link>
              .
            </p>
          ) : null}
          <Button variant="outline" size="lg" disabled={pendiente} onClick={cancelar}>
            Ya no
          </Button>
        </div>
      ) : conHora ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            pedir({ hora })
          }}
        >
          <label className="sr-only" htmlFor="aviso-hasta">
            Avisarme hasta las
          </label>
          <input
            id="aviso-hasta"
            type="time"
            required
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-4xl border border-border bg-input/30 px-4 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <Button type="submit" size="lg" disabled={pendiente || !hora}>
            Avisarme
          </Button>
        </form>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button size="lg" disabled={pendiente} onClick={() => pedir({ horas: 1 })}>
            1 hora
          </Button>
          <Button size="lg" disabled={pendiente} onClick={() => pedir({ horas: 2 })}>
            2 horas
          </Button>
          <Button variant="outline" size="lg" disabled={pendiente} onClick={() => setConHora(true)}>
            Hasta las…
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
