"use client"

import { CheckCircle2, Loader2, Star } from "lucide-react"
import * as React from "react"

import { PagoMovilCard } from "@/components/nueva/pasajero/pago-movil-card"
import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/nueva/ui/drawer"
import { Textarea } from "@/components/nueva/ui/textarea"
import { calificarViaje, omitirCalificacion } from "@/lib/acciones/pasajero"
import type { DatosPagoMovil } from "@/lib/bancos"
import type { Tarifa } from "@/lib/tarifas"
import { cn } from "@/lib/utils"
import { SENTIDOS, type Sentido } from "@/lib/viajes"

const ETIQUETAS = ["Puntual", "Seguro", "Amable", "Respetó el orden", "Carro limpio"] as const
const SIGNIFICADO = ["", "Muy mal", "Mal", "Regular", "Bien", "Excelente"]

export type ViajePorCalificar = { reservaId: string; viajeId: string; choferId: string; chofer: string; sentido: Sentido }

/**
 * Al terminar el viaje (R45, R74): "Llegaste bien", el Pago Móvil del chofer con el pasaje y "Calificar viaje"
 * (estrellas; etiquetas y comentario opcionales). "Ahora no" lo deja para Mis viajes.
 */
export function ViajeTerminado({ viaje, pago, pasaje }: { viaje: ViajePorCalificar; pago: DatosPagoMovil | null; pasaje: Tarifa }) {
  const [omitiendo, omitir] = React.useTransition()
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-primary/30 bg-card p-4 text-card-foreground">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <CheckCircle2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-semibold">Llegaste bien</p>
          <p className="text-sm text-muted-foreground">
            {SENTIDOS[viaje.sentido].largo} · con {viaje.chofer}
          </p>
        </div>
      </div>
      {pago ? <PagoMovilCard datos={pago} chofer={viaje.chofer} pasaje={pasaje} /> : null}
      <CalificarDrawer viaje={viaje} trigger={<Button size="lg">Calificar viaje</Button>} />
      <Button variant="ghost" size="lg" disabled={omitiendo} onClick={() => omitir(async () => void (await omitirCalificacion(viaje.reservaId)))}>
        Ahora no
      </Button>
    </section>
  )
}

/** "¿Cómo te fue con…?" (R45). `volver`: adónde ir al enviar (por defecto, Inicio) */
export function CalificarDrawer({
  viaje,
  trigger,
  volver,
}: {
  viaje: Pick<ViajePorCalificar, "viajeId" | "choferId" | "chofer">
  trigger: React.ReactElement
  volver?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [estrellas, setEstrellas] = React.useState(0)
  const [etiquetas, setEtiquetas] = React.useState<string[]>([])
  const [comentario, setComentario] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pendiente, iniciar] = React.useTransition()

  function enviar(ev: React.FormEvent) {
    ev.preventDefault()
    if (estrellas === 0) return setError("Toca una estrella para calificar.")
    const fd = new FormData()
    fd.set("viaje", viaje.viajeId)
    fd.set("chofer", viaje.choferId)
    if (volver) fd.set("volver", volver)
    fd.set("estrellas", String(estrellas))
    etiquetas.forEach((e) => fd.append("etiquetas", e))
    if (comentario.trim()) fd.set("comentario", comentario.trim())
    iniciar(async () => {
      // Si sale bien, la acción lleva a /n
      const r = await calificarViaje({}, fd)
      if (r?.error) setError(r.error)
    })
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger render={trigger} />
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <form onSubmit={enviar} className="flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="font-heading text-xl">¿Cómo te fue con {viaje.chofer.split(" ")[0]}?</DrawerTitle>
            <DrawerDescription>Tu calificación ayuda a todos a escoger con confianza.</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-5 px-4">
            <div className="flex flex-col items-center gap-2">
              <div role="radiogroup" aria-label="Estrellas" className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={estrellas === n}
                    aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
                    onClick={() => (setEstrellas(n), setError(null))}
                    className="rounded-full p-1.5 transition-transform active:scale-90"
                  >
                    <Star className={cn("size-9 transition-colors", n <= estrellas ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                  </button>
                ))}
              </div>
              <p className={cn("h-5 text-sm", error ? "text-destructive" : "text-muted-foreground")}>{error ?? SIGNIFICADO[estrellas]}</p>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="font-medium">¿Qué destacas?</legend>
              <div className="flex flex-wrap gap-2">
                {ETIQUETAS.map((e) => {
                  const activa = etiquetas.includes(e)
                  return (
                    <button
                      key={e}
                      type="button"
                      aria-pressed={activa}
                      onClick={() => setEtiquetas((p) => (activa ? p.filter((x) => x !== e) : [...p, e]))}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        activa ? "border-primary bg-primary/10 text-primary" : "bg-input/30 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {e}
                    </button>
                  )
                })}
              </div>
            </fieldset>
            <div className="flex flex-col gap-2">
              <label htmlFor="comentario" className="font-medium">
                Comentario <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <Textarea id="comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} rows={2} maxLength={140} />
            </div>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <Button type="submit" size="lg" disabled={pendiente}>
              {pendiente ? <Loader2 className="animate-spin" /> : null}
              Enviar
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
              Después
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
