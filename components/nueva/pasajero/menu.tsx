"use client"

import { CheckCircle2, ChevronRight, Lightbulb, Loader2, LogOut, Star } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/nueva/ui/drawer"
import { Textarea } from "@/components/nueva/ui/textarea"
import { salir } from "@/lib/acciones/cuenta"
import { enviarSugerencia, valorarApp } from "@/lib/acciones/sugerencias"
import { cn } from "@/lib/utils"

const MAXIMO = 1000

/** Una línea del Menú: ícono, título, detalle y flecha */
function MenuItem({
  icon: Icon,
  titulo,
  detalle,
  destructivo = false,
  ...props
}: React.ComponentProps<"button"> & { icon: React.ComponentType<{ className?: string }>; titulo: string; detalle?: React.ReactNode; destructivo?: boolean }) {
  return (
    <button type="button" className="flex w-full items-center gap-3 p-3 text-left transition-colors active:bg-muted" {...props}>
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", destructivo ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium", destructivo && "text-destructive")}>{titulo}</p>
        {detalle ? <p className="truncate text-sm text-muted-foreground">{detalle}</p> : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

function Gracias({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckCircle2 className="size-7" />
      </div>
      <DrawerTitle className="font-heading text-xl">{titulo}</DrawerTitle>
      <DrawerDescription>{texto}</DrawerDescription>
      <DrawerClose render={<Button size="lg" className="mt-2 w-full" />}>Listo</DrawerClose>
    </div>
  )
}

/** Enviar una sugerencia (R81): un texto que le llega al admin */
export function SugerenciaDrawer() {
  const [open, setOpen] = React.useState(false)
  const [texto, setTexto] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [enviada, setEnviada] = React.useState(false)
  const [pendiente, iniciar] = React.useTransition()

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return setError("Escribe tu sugerencia antes de enviar.")
    const fd = new FormData()
    fd.set("texto", texto.trim())
    iniciar(async () => {
      const r = await enviarSugerencia({}, fd)
      const fallo = r.errores?.texto ?? r.error
      if (fallo) setError(fallo)
      else setEnviada(true)
    })
  }

  return (
    <Drawer open={open} onOpenChange={(o) => (setOpen(o), !o && (setTexto(""), setError(null), setEnviada(false)))} showSwipeHandle>
      <MenuItem icon={Lightbulb} titulo="Enviar una sugerencia" detalle="Para mejorar la línea o la app" onClick={() => setOpen(true)} />
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        {enviada ? (
          <Gracias titulo="¡Gracias por tu sugerencia!" texto="Le llegó al administrador de la línea." />
        ) : (
          <form onSubmit={enviar} className="flex flex-col">
            <DrawerHeader>
              <DrawerTitle className="font-heading text-xl">Enviar una sugerencia</DrawerTitle>
              <DrawerDescription>Algo que te gustaría cambiar o mejorar. Solo la lee el administrador.</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-2 px-4">
              <Textarea
                value={texto}
                onChange={(e) => (setTexto(e.target.value.slice(0, MAXIMO)), error && setError(null))}
                placeholder="Ej.: que la app avise cuando el carro esté cerca."
                rows={4}
                maxLength={MAXIMO}
                aria-label="Sugerencia"
                aria-invalid={error ? true : undefined}
                autoFocus
              />
              <div className="flex items-center justify-between text-xs">
                <span role="alert" className="text-destructive">
                  {error ?? ""}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {texto.length}/{MAXIMO}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <Button type="submit" size="lg" disabled={pendiente}>
                {pendiente ? <Loader2 className="animate-spin" /> : null}
                Enviar
              </Button>
              <DrawerClose render={<Button variant="ghost" size="lg" />}>Cancelar</DrawerClose>
            </div>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  )
}

/** "¿Qué tal la app?" (R82), siempre a mano en el Menú */
export function OpinionAppDrawer() {
  const [open, setOpen] = React.useState(false)
  const [estrellas, setEstrellas] = React.useState(0)
  const [comentario, setComentario] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [enviada, setEnviada] = React.useState(false)
  const [pendiente, iniciar] = React.useTransition()

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (estrellas === 0) return setError("Toca una estrella.")
    iniciar(async () => {
      const r = await valorarApp(estrellas, comentario)
      if (r.error) setError(r.error)
      else setEnviada(true)
    })
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => (setOpen(o), !o && (setEstrellas(0), setComentario(""), setError(null), setEnviada(false)))}
      showSwipeHandle
    >
      <MenuItem icon={Star} titulo="¿Qué tal la app?" detalle="Tu opinión nos ayuda a mejorarla" onClick={() => setOpen(true)} />
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        {enviada ? (
          <Gracias titulo="¡Gracias por tu opinión!" texto="La leemos para mejorar la app." />
        ) : (
          <form onSubmit={enviar} className="flex flex-col">
            <DrawerHeader>
              <DrawerTitle className="font-heading text-xl">¿Qué tal te parece la app?</DrawerTitle>
              <DrawerDescription>Un toque basta.</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-4 px-4">
              <div role="radiogroup" aria-label="Estrellas para la app" className="flex justify-center gap-1">
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
                    <Star className={cn("size-9", n <= estrellas ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                  </button>
                ))}
              </div>
              {estrellas > 0 ? (
                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder={estrellas <= 3 ? "¿Qué te molesta? (opcional)" : "¿Algo que mejorar? (opcional)"}
                  rows={2}
                  maxLength={MAXIMO}
                  aria-label="Comentario"
                />
              ) : null}
              {error ? (
                <p role="alert" className="text-center text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 p-4">
              <Button type="submit" size="lg" disabled={pendiente}>
                {pendiente ? <Loader2 className="animate-spin" /> : null}
                Enviar
              </Button>
              <DrawerClose render={<Button variant="ghost" size="lg" />}>Ahora no</DrawerClose>
            </div>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  )
}

/** Cerrar sesión, con confirmación */
export function CerrarSesionDrawer() {
  const [open, setOpen] = React.useState(false)
  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <MenuItem icon={LogOut} titulo="Cerrar sesión" destructivo onClick={() => setOpen(true)} />
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          <DrawerTitle className="font-heading text-xl">¿Cerrar sesión?</DrawerTitle>
          <DrawerDescription>Para volver a entrar necesitas tu teléfono y tu PIN.</DrawerDescription>
        </DrawerHeader>
        <form action={salir} className="flex flex-col gap-2 p-4">
          <Button type="submit" variant="destructive" size="lg">
            Sí, cerrar sesión
          </Button>
          <DrawerClose render={<Button type="button" variant="ghost" size="lg" />}>No, quedarme</DrawerClose>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
