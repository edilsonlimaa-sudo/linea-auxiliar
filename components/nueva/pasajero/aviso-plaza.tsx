"use client"

import { Dialog } from "@base-ui/react/dialog"
import { BellOff, BellRing, CheckCircle2, ListOrdered, Loader2, Smartphone, TreePine, Users } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { activarAvisos, type EstadoAvisos, revisarAvisos } from "@/lib/avisos-celular"
import { cn } from "@/lib/utils"

/**
 * R115: antes de anotarse en la lista hacia Valle Grande, a pantalla completa y corto: esperar en la plaza, y si este
 * celular podrá avisarle cuando llegue el carro (R116), para que lo corrija. "Entendido, anotarme" sigue a la hoja.
 */
export function AvisoPlaza({ abierto, onCerrar, onContinuar }: { abierto: boolean; onCerrar: () => void; onContinuar: () => void }) {
  return (
    <Dialog.Root open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 z-50 overflow-y-auto bg-background outline-none transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0">
          <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col gap-5 px-4 pt-[max(env(safe-area-inset-top),2rem)] pb-[max(env(safe-area-inset-bottom),1rem)]">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <TreePine className="size-6" />
            </div>
            <div className="flex flex-col gap-2">
              <Dialog.Title className="font-heading text-2xl font-semibold">Espera en la Plaza Rómulo Gallegos</Dialog.Title>
              <Dialog.Description className="text-muted-foreground">
                El comercio Gina nos pidió no hacer fila frente a su local.
              </Dialog.Description>
            </div>

            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-3">
                <ListOrdered className="size-5 shrink-0 text-primary" />
                <span>Tu puesto lo guarda la app, no la fila.</span>
              </li>
              <li className="flex items-center gap-3">
                <Users className="size-5 shrink-0 text-primary" />
                <span>Cuando llega un carro, bajan solo los primeros de la lista.</span>
              </li>
            </ul>

            <AvisosDeLlegada />

            <div className="mt-auto flex flex-col gap-2 pt-2">
              <Button size="lg" onClick={onContinuar}>
                Entendido, anotarme
              </Button>
              <Dialog.Close render={<Button variant="ghost" size="lg" />}>Ahora no</Dialog.Close>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Cómo permitir los avisos bloqueados: el navegador no deja volver a pedirlos, solo se cambian en los ajustes */
export function PasosDesbloquear() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-secondary p-3 text-sm">
      <p>
        <strong>En el navegador:</strong> toca el candado o los ajustes al lado de la dirección → <strong>Permisos</strong> →{" "}
        <strong>Notificaciones</strong> → Permitir.
      </p>
      <p>
        <strong>Si la tienes instalada:</strong> deja el dedo sobre el ícono de Línea Auxiliar → <strong>Información de la app</strong> →{" "}
        <strong>Notificaciones</strong> → Activar.
      </p>
    </div>
  )
}

/**
 * Si este celular podrá avisarle cuando llegue el carro (R90, R116): sí, se dice en una línea; si no, por qué y el arreglo
 * de un toque si lo hay. Bloqueados, el paso a paso queda plegado (casi nadie lo hace) y se recuerda mirar la app.
 */
function AvisosDeLlegada() {
  const [estado, setEstado] = React.useState<EstadoAvisos>("cargando")
  const [error, setError] = React.useState<string>()
  const [verPasos, setVerPasos] = React.useState(false)
  const [pendiente, iniciar] = React.useTransition()

  React.useEffect(() => {
    let vigente = true
    revisarAvisos()
      .then((e) => vigente && setEstado(e))
      .catch(() => vigente && setEstado("sin-soporte"))
    return () => {
      vigente = false
    }
  }, [])

  const activar = () =>
    iniciar(async () => {
      setError(undefined)
      // Bloqueados, el navegador no vuelve a preguntar: esto solo revisa si ya los permitió en los ajustes
      const r = await activarAvisos()
      setError(r.error ?? (estado === "bloqueado" && r.estado === "bloqueado" ? "Todavía están bloqueados." : undefined))
      setEstado(r.estado)
    })

  if (estado === "cargando") return <div className="h-[76px] rounded-3xl bg-card/60" aria-hidden />

  const bien = estado === "activo"
  const t = {
    activo: { icono: <CheckCircle2 className="size-5" />, texto: "Este celular te avisará cuando llegue tu carro y si te toca bajar." },
    inactivo: { icono: <BellRing className="size-5" />, texto: "Activa los avisos y te decimos cuándo llega tu carro y si te toca bajar." },
    bloqueado: { icono: <BellOff className="size-5" />, texto: "Este celular tiene los avisos bloqueados: no podremos avisarte. Mira la app para saber cuándo te toca." },
    iphone: { icono: <Smartphone className="size-5" />, texto: "En iPhone, los avisos llegan solo con la app instalada (Compartir → Agregar a inicio). Mientras, mira la app." },
    "sin-soporte": { icono: <BellOff className="size-5" />, texto: "Este celular no recibe avisos. Mira la app para saber cuándo te toca." },
  }[estado]

  return (
    <section
      aria-label="Avisos cuando llegue un carro"
      className={cn(
        "flex flex-col gap-3 rounded-3xl p-4",
        bien ? "bg-success/10" : estado === "inactivo" ? "border border-primary/30 bg-card" : "border border-destructive/30 bg-card"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl",
            bien ? "bg-success/15 text-success" : estado === "inactivo" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          )}
        >
          {t.icono}
        </div>
        <p className="min-w-0 flex-1 text-sm">{t.texto}</p>
      </div>
      {estado === "inactivo" ? (
        <Button disabled={pendiente} onClick={activar}>
          {pendiente ? <Loader2 className="animate-spin" /> : <BellRing />}
          Activar avisos
        </Button>
      ) : null}
      {estado === "bloqueado" ? (
        verPasos ? (
          <>
            <PasosDesbloquear />
            <Button variant="outline" disabled={pendiente} onClick={activar}>
              {pendiente ? <Loader2 className="animate-spin" /> : <BellRing />}
              Ya los permití
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setVerPasos(true)}>
            ¿Cómo desbloquearlos?
          </Button>
        )
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
