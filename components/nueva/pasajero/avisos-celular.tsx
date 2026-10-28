"use client"

import { BellOff, BellRing, Loader2, Smartphone, X } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { activarAvisos, type EstadoAvisos, posponerRecordatorio, puedeRecordar, revisarAvisos } from "@/lib/avisos-celular"

/**
 * Avisos en el celular (R90), arriba de la pestaña Notificaciones: el permiso se pide solo al tocar "Avisarme en el
 * celular". Explica qué hacer si el teléfono lo bloqueó o si es un iPhone sin la app instalada. Ya activados, no se ve.
 * Con `recordatorio` (arriba de Inicio): solo después de la bienvenida y cuando toca (`puedeRecordar`), y con ✕ para
 * dejarlo para dentro de 7 días.
 */
export function AvisosCelular({ recordatorio = false }: { recordatorio?: boolean }) {
  const [estado, setEstado] = React.useState<EstadoAvisos>("cargando")
  const [cerrado, setCerrado] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const [pendiente, iniciar] = React.useTransition()

  React.useEffect(() => {
    let vigente = true
    if (recordatorio && !puedeRecordar()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lo que guardó el aparato solo se lee en el navegador
      setEstado("sin-soporte") // todavía no toca: no se muestra
      return
    }
    revisarAvisos()
      .then((e) => vigente && setEstado(e))
      .catch(() => vigente && setEstado("sin-soporte"))
    return () => {
      vigente = false
    }
  }, [recordatorio])

  const activar = () =>
    iniciar(async () => {
      setError(undefined)
      const r = await activarAvisos()
      setEstado(r.estado)
      setError(r.error)
    })

  // Activados, la tarjeta no aparece: la app no ofrece apagarlos (quien no los quiera, los bloquea en el teléfono)
  if (cerrado || estado === "cargando" || estado === "sin-soporte" || estado === "activo") return null

  const textos: Record<"iphone" | "bloqueado" | "inactivo", { icono: React.ReactNode; titulo: string; texto: string }> = {
    inactivo: {
      icono: <BellRing className="size-5" />,
      titulo: "Recibe los avisos en tu celular",
      texto: "Te avisamos aunque la app esté cerrada.",
    },
    bloqueado: {
      icono: <BellOff className="size-5" />,
      titulo: "Los avisos están bloqueados en este celular",
      texto: "Para activarlos, abre los ajustes del navegador, busca Notificaciones y permite esta app.",
    },
    iphone: {
      icono: <Smartphone className="size-5" />,
      titulo: "Para recibir avisos en el iPhone",
      texto: "Primero agrega la app a tu pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ese ícono.",
    },
  }
  const t = textos[estado]

  return (
    <section aria-label={t.titulo} className="flex flex-col gap-3 rounded-3xl border border-primary/30 bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">{t.icono}</div>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold">{t.titulo}</p>
          <p className="text-sm text-muted-foreground">{t.texto}</p>
        </div>
        {recordatorio ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Ahora no"
            onClick={() => (posponerRecordatorio(), setCerrado(true))}
            className="-mt-1 -mr-1 shrink-0"
          >
            <X />
          </Button>
        ) : null}
      </div>
      {estado === "inactivo" ? (
        <Button disabled={pendiente} onClick={activar}>
          {pendiente ? <Loader2 className="animate-spin" /> : <BellRing />}
          Avisarme en el celular
        </Button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
