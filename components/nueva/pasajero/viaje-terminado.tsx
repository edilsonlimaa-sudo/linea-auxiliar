"use client"

import { CheckCircle2, Loader2, Star, X } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/nueva/ui/drawer"
import { Textarea } from "@/components/nueva/ui/textarea"
import { calificarViaje, omitirCalificacion } from "@/lib/acciones/pasajero"
import { cn } from "@/lib/utils"
import { SENTIDOS, type Sentido } from "@/lib/viajes"

const ETIQUETAS = ["Puntual", "Seguro", "Amable", "Respetó el orden", "Carro limpio"] as const
const SIGNIFICADO = ["", "Muy mal", "Mal", "Regular", "Bien", "Excelente"]

export type ViajePorCalificar = { reservaId: string; viajeId: string; choferId: string; chofer: string; sentido: Sentido }

// Confeti fijo (mismo dibujo en el servidor y en el celular): posición, color, demora y giro de cada papelito
const COLORES = ["var(--primary)", "#f59e0b", "#fb7185", "#10b981", "#a78bfa"]
const CONFETI = Array.from({ length: 28 }, (_, i) => ({
  "--x": `${(i * 37) % 100}%`,
  "--c": COLORES[i % COLORES.length],
  "--r": `${(i % 7) * 0.12}s`,
  "--d": `${2.4 + (i % 5) * 0.25}s`,
  "--g": `${360 + ((i * 53) % 360)}deg`,
})) as React.CSSProperties[]

/**
 * Al terminar el viaje (R45): una pantalla de paso "¡Llegaste bien!" con confeti y las estrellas para calificar (tocar
 * una abre el resto: etiquetas y comentario opcionales). "Ahora no" o la ✕ lo dejan para Mis viajes; las dos, igual
 * que calificar, llevan a Inicio. Sin Pago Móvil: en la nueva va solo a bordo (R74).
 */
export function LlegasteBien({ viaje }: { viaje: ViajePorCalificar }) {
  const [omitiendo, omitir] = React.useTransition()
  const nombre = viaje.chofer.split(" ")[0]
  const salir = () => omitir(async () => void (await omitirCalificacion(viaje.reservaId)))

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div aria-hidden className="confeti pantalla">
        {CONFETI.map((c, i) => (
          <i key={i} style={c} />
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="icon" aria-label="Cerrar" disabled={omitiendo} onClick={salir}>
          <X className="size-5" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-24 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-12" />
          </div>
          <h1 className="font-heading text-3xl font-semibold">¡Llegaste bien!</h1>
          <p className="text-muted-foreground">
            {SENTIDOS[viaje.sentido].largo} · con {viaje.chofer}
          </p>
        </div>

        <section className="flex w-full flex-col items-center gap-3 rounded-3xl border bg-card p-5">
          <p className="font-heading text-lg font-semibold">¿Cómo te fue con {nombre}?</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <CalificarDrawer
                key={n}
                viaje={viaje}
                estrellasIniciales={n}
                trigger={
                  <button type="button" aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} className="rounded-full p-1 transition-transform active:scale-90">
                    <Star className="size-10 text-amber-400" />
                  </button>
                }
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Toca las estrellas. Ayuda a todos a escoger con confianza.</p>
        </section>
      </div>

      <Button variant="ghost" size="lg" disabled={omitiendo} onClick={salir}>
        {omitiendo ? <Loader2 className="animate-spin" /> : null}
        Ahora no
      </Button>
    </div>
  )
}

/** "¿Cómo te fue con…?" (R45). `volver`: adónde ir al enviar (por defecto, Inicio) */
export function CalificarDrawer({
  viaje,
  trigger,
  volver,
  estrellasIniciales = 0,
}: {
  viaje: Pick<ViajePorCalificar, "viajeId" | "choferId" | "chofer">
  trigger: React.ReactElement
  volver?: string
  estrellasIniciales?: number // la estrella que tocó para abrir (en "Llegaste bien")
}) {
  const [open, setOpen] = React.useState(false)
  const [estrellas, setEstrellas] = React.useState(estrellasIniciales)
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
