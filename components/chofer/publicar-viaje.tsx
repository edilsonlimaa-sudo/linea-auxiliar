"use client"

import { CheckIcon, ChevronDownIcon, Loader2Icon, MinusIcon, PlusIcon, SendIcon } from "lucide-react"
import { useEffect, useId, useRef, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { publicarViaje } from "@/lib/acciones/chofer"
import { cn } from "@/lib/utils"
import { contrario, SENTIDOS, type Sentido } from "@/lib/viajes"

/**
 * Cómo se pregunta el tiempo (docs/especificacion.md §8):
 * - primero: no tiene viajes → "¿Cuándo llegas a recoger?" (incluye "Ya estoy aquí")
 * - cadena: tiene una recogida en curso → el nuevo es "próximo": cuánto tarda DESPUÉS de salir (R11–R12)
 * - desde_ruta: solo va en ruta → el nuevo empieza ya en camino (sin "Ya estoy aquí": todavía va manejando)
 */
export type ModoPublicar = "primero" | "cadena" | "desde_ruta"

const TIEMPOS: Record<ModoPublicar, { pregunta: string; ayuda?: string; rapidos: number[]; inicial: number; yaEstoy: boolean }> = {
  primero: { pregunta: "¿Cuándo llegas a recoger?", rapidos: [5, 10, 15, 20], inicial: 10, yaEstoy: true },
  cadena: {
    pregunta: "¿Cuánto tardas en llegar a recoger después de salir?",
    ayuda: "Este viaje empieza solo cuando sales con el actual.",
    rapidos: [15, 20, 30, 45],
    inicial: 20,
    yaEstoy: false,
  },
  desde_ruta: { pregunta: "¿Cuándo llegas a recoger?", rapidos: [5, 10, 15, 20], inicial: 15, yaEstoy: false },
}

/** Tarjeta de opción grande (radio nativo oculto: teclado y lector de pantalla funcionan) */
export function Opcion({
  nombre,
  elegida,
  onElegir,
  children,
  className,
}: {
  nombre: string
  elegida: boolean
  onElegir: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <label
      className={cn(
        "flex min-h-13 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2 text-center font-bold has-focus-visible:ring-[3px] has-focus-visible:ring-ring",
        elegida ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
        className
      )}
    >
      <input type="radio" name={nombre} checked={elegida} onChange={onElegir} className="sr-only" />
      {children}
    </label>
  )
}

/**
 * Publicar un viaje (R10) o agregar otro a la cadena (R11). Pensado para hacerlo parado y con prisa: todo se
 * toca; solo "Otro" y "A una hora" piden escribir. Sugiere el sentido contrario al último viaje y los mismos puestos.
 */
export function PublicarViaje({
  modo,
  ultimo,
  sentidoInicial,
  enHoja = false,
  onPublicado,
}: {
  modo: ModoPublicar
  ultimo: { sentido: Sentido; puestos: number } | null
  sentidoInicial?: Sentido | null // si no se indica, el contrario al último viaje
  enHoja?: boolean // dentro de "Agregar otro viaje": el botón no se pega abajo de la página
  onPublicado?: () => void
}) {
  const idOtro = useId()
  const idHora = useId()
  const tiempos = TIEMPOS[modo]
  const [sentido, setSentido] = useState<Sentido>(
    sentidoInicial ?? (ultimo ? contrario(ultimo.sentido) : "vg_a_centro")
  )
  const [puestos, setPuestos] = useState(ultimo?.puestos ?? 4)
  const [cuando, setCuando] = useState<number | "otro" | "hora">(tiempos.inicial)
  const [otro, setOtro] = useState("")
  const [hora, setHora] = useState("")
  const [vuelta, setVuelta] = useState<number | null>(null) // R61: null = solo ida; si no, minutos después de salir
  const [conVuelta, setConVuelta] = useState(false)
  const [error, setError] = useState<string>()
  const regreso = contrario(sentido)

  // La pregunta de la vuelta queda al final, detrás del botón fijo: mientras no se ve, la barra muestra la escogida y
  // lleva hasta ella con un toque (R61). El margen de abajo descuenta lo que tapa la barra.
  const refVuelta = useRef<HTMLFieldSetElement>(null)
  const refBarra = useRef<HTMLDivElement>(null)
  // Lleva la pregunta (con sus minutos) justo encima de la barra fija, descontando lo que mide la barra
  const mostrarVuelta = () => {
    const el = refVuelta.current
    if (!el) return
    el.style.scrollMarginBottom = `${(refBarra.current?.offsetHeight ?? 0) + 16}px`
    el.scrollIntoView({ behavior: "smooth", block: "end" })
  }
  // Al escoger "Ida y vuelta" aparecen los minutos debajo: que no queden detrás de la barra
  useEffect(() => {
    if (conVuelta) mostrarVuelta()
  }, [conVuelta])
  const [vueltaALaVista, setVueltaALaVista] = useState(true)
  useEffect(() => {
    const el = refVuelta.current
    if (!el) return
    const observador = new IntersectionObserver(([e]) => setVueltaALaVista(e.isIntersecting), { rootMargin: "0px 0px -160px 0px" })
    observador.observe(el)
    return () => observador.disconnect()
  }, [])
  const [enviando, iniciar] = useTransition()

  const publicar = () =>
    iniciar(async () => {
      const datos = new FormData()
      datos.set("sentido", sentido)
      datos.set("puestos", String(puestos))
      if (cuando === "hora") datos.set("hora", hora)
      else datos.set("minutos", cuando === "otro" ? otro : String(cuando))
      if (conVuelta) datos.set("vuelta", vuelta === null ? "" : String(vuelta))
      if (conVuelta && vuelta === null) return setError("Escoge cuánto tardas en llegar a recoger para la vuelta.")
      const r = await publicarViaje(datos)
      setError(r.error)
      if (r.ok) onPublicado?.()
    })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        publicar()
      }}
      className="flex flex-col gap-6"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-bold">¿Hacia dónde vas?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SENTIDOS) as Sentido[]).map((s) => (
            <Opcion key={s} nombre="sentido-opcion" elegida={sentido === s} onElegir={() => setSentido(s)} className="min-h-18 flex-col gap-0">
              <span className="flex items-center gap-1.5 text-lg">
                {sentido === s && <CheckIcon aria-hidden className="size-5" />}
                {SENTIDOS[s].corto}
              </span>
            </Opcion>
          ))}
        </div>
        <p className="text-[15px] text-muted-foreground">Recoges {SENTIDOS[sentido].enRecogida}.</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-bold">¿Cuántos puestos llevas?</legend>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon-lg" aria-label="Un puesto menos" disabled={puestos <= 1} onClick={() => setPuestos((p) => p - 1)}>
            <MinusIcon aria-hidden />
          </Button>
          <output aria-live="polite" className="min-w-16 text-center text-4xl font-bold tabular-nums">
            {puestos}
          </output>
          <Button type="button" variant="outline" size="icon-lg" aria-label="Un puesto más" disabled={puestos >= 8} onClick={() => setPuestos((p) => p + 1)}>
            <PlusIcon aria-hidden />
          </Button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-bold">{tiempos.pregunta}</legend>
        {tiempos.ayuda && <p className="-mt-1 text-[15px] text-muted-foreground">{tiempos.ayuda}</p>}
        <div className="grid grid-cols-3 gap-2">
          {tiempos.yaEstoy && (
            <Opcion nombre="cuando" elegida={cuando === 0} onElegir={() => setCuando(0)} className="col-span-3">
              Ya estoy aquí
            </Opcion>
          )}
          {tiempos.rapidos.map((m) => (
            <Opcion key={m} nombre="cuando" elegida={cuando === m} onElegir={() => setCuando(m)}>
              {m} min
            </Opcion>
          ))}
          <Opcion nombre="cuando" elegida={cuando === "otro"} onElegir={() => setCuando("otro")}>
            Otro
          </Opcion>
          <Opcion nombre="cuando" elegida={cuando === "hora"} onElegir={() => setCuando("hora")} className="col-span-3">
            A una hora
          </Opcion>
        </div>
        {cuando === "otro" && (
          <div className="flex items-center gap-3">
            <Input
              id={idOtro}
              type="number"
              inputMode="numeric"
              min={1}
              max={240}
              value={otro}
              onChange={(e) => setOtro(e.target.value)}
              autoFocus
              className="w-28 text-center"
              aria-label="Minutos"
            />
            <label htmlFor={idOtro} className="font-bold">
              minutos
            </label>
          </div>
        )}
        {cuando === "hora" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idHora} className="font-bold">
              Llego a las
            </label>
            <Input id={idHora} type="time" value={hora} onChange={(e) => setHora(e.target.value)} autoFocus className="w-40" />
            <p className="text-[15px] text-muted-foreground">Si esa hora ya pasó hoy, es la de mañana.</p>
          </div>
        )}
      </fieldset>

      {/* R61: la vuelta es el sentido contrario con los mismos puestos; solo se pregunta cuándo llega a recoger */}
      <fieldset ref={refVuelta} className="flex scroll-mt-4 flex-col gap-2">
        <legend className="mb-2 text-lg font-bold">¿Después recoges gente {SENTIDOS[regreso].enRecogida} para volver?</legend>
        <div className="grid grid-cols-2 gap-2">
          <Opcion nombre="vuelta" elegida={!conVuelta} onElegir={() => (setConVuelta(false), setVuelta(null))}>
            Solo ida
          </Opcion>
          <Opcion nombre="vuelta" elegida={conVuelta} onElegir={() => setConVuelta(true)}>
            Ida y vuelta
          </Opcion>
        </div>
        {conVuelta && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="font-bold">¿Cuánto tardas en llegar a recoger {SENTIDOS[regreso].enRecogida} después de salir?</p>
            <div className="grid grid-cols-2 gap-2">
              {[15, 20, 30, 45].map((m) => (
                <Opcion key={m} nombre="vuelta-min" elegida={vuelta === m} onElegir={() => setVuelta(m)}>
                  {m} min
                </Opcion>
              ))}
            </div>
            <p className="text-[15px] text-muted-foreground">
              La vuelta ({SENTIDOS[regreso].hacia}, {puestos} {puestos === 1 ? "puesto" : "puestos"}) se publica ya y empieza sola cuando sales.
            </p>
          </div>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}

      <div
        ref={refBarra}
        className={
          enHoja
            ? "sticky bottom-0 -mx-5 border-t bg-popover px-5 pt-3 pb-5"
            : "sticky bottom-0 -mx-4 border-t bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur"
        }
      >
        {!vueltaALaVista && (
          <button
            type="button"
            onClick={mostrarVuelta}
            className="mb-2 flex min-h-11 w-full items-center gap-1.5 rounded-xl px-1 text-left text-[15px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <span className="font-bold">{conVuelta ? "Ida y vuelta" : "Solo ida"}</span>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <span className="min-w-0 flex-1 truncate font-bold text-primary">
              {conVuelta ? (vuelta === null ? "Falta cuándo recoges" : `recoges ${vuelta} min después`) : "¿Recoges gente para volver?"}
            </span>
            <ChevronDownIcon aria-hidden className="size-5 shrink-0 text-primary" />
          </button>
        )}
        <Button type="submit" variant="signal" size="lg" className="w-full" disabled={enviando}>
          {enviando ? <Loader2Icon aria-hidden className="animate-spin" /> : <SendIcon aria-hidden />}
          {enviando ? "Publicando…" : conVuelta ? "Publicar ida y vuelta" : modo === "cadena" ? "Agregar como próximo viaje" : "Publicar viaje"}
        </Button>
      </div>
    </form>
  )
}
