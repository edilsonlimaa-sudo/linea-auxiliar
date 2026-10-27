"use client"

import { Building2, Home, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { ErrorAccion, puestosTexto } from "@/components/nueva/chofer/comun"
import { Button } from "@/components/nueva/ui/button"
import { Input } from "@/components/nueva/ui/input"
import { Switch } from "@/components/nueva/ui/switch"
import { publicarViaje } from "@/lib/acciones/chofer"
import { cn } from "@/lib/utils"
import { contrario, SENTIDOS, type Sentido } from "@/lib/viajes"

/**
 * Cómo se pregunta el tiempo (reglas de components/chofer/publicar-viaje.tsx):
 * - primero: sin viajes → "¿Cuándo llegas a recoger?" (con "Ya estoy aquí")
 * - cadena: con una recogida en curso → cuánto tarda DESPUÉS de salir (R11–R12)
 * - desde_ruta: solo va en ruta → empieza ya en camino (sin "Ya estoy aquí")
 */
export type ModoPublicar = "primero" | "cadena" | "desde_ruta"

const TIEMPOS: Record<ModoPublicar, { pregunta: string; aviso?: string; rapidos: number[]; inicial: number; yaEstoy: boolean }> = {
  primero: { pregunta: "¿Cuándo llegas a la zona de recogida?", rapidos: [5, 10, 15, 20], inicial: 10, yaEstoy: true },
  cadena: {
    pregunta: "¿Cuánto tardas en llegar a recoger después de salir?",
    aviso: "Tienes un viaje recogiendo. Este queda como tu próximo viaje y empieza solo cuando salgas del actual.",
    rapidos: [15, 20, 30, 45],
    inicial: 20,
    yaEstoy: false,
  },
  desde_ruta: {
    pregunta: "¿Cuándo llegas a la zona de recogida?",
    aviso: "Vas en ruta. Este viaje empieza ya: los pasajeros te ven en camino a recogerlos.",
    rapidos: [5, 10, 15, 20],
    inicial: 15,
    yaEstoy: false,
  },
}

const ICONOS: Record<Sentido, typeof Home> = { vg_a_centro: Building2, centro_a_vg: Home }
const PUESTOS = [1, 2, 3, 4, 5, 6, 7, 8]
const VUELTA_MIN = [15, 20, 30, 45]

/**
 * Publicar un viaje (R10) o agregarlo a la cadena (R11), con el aspecto del prototipo: una sola pantalla de toques; solo
 * "Otro" y "Hora fija" piden escribir. El sentido nunca viene escogido (R10); los puestos, los del último viaje. Ida y
 * vuelta (R61) publica también la vuelta.
 */
export function PublicarFormulario({ modo, puestosIniciales }: { modo: ModoPublicar; puestosIniciales: number }) {
  const router = useRouter()
  const tiempos = TIEMPOS[modo]
  const [sentido, setSentido] = React.useState<Sentido | null>(null)
  const [puestos, setPuestos] = React.useState(puestosIniciales)
  const [cuando, setCuando] = React.useState<number | "otro" | "hora">(tiempos.inicial)
  const [otro, setOtro] = React.useState("")
  const [hora, setHora] = React.useState("")
  const [conVuelta, setConVuelta] = React.useState(false)
  const [vuelta, setVuelta] = React.useState(30)
  const [error, setError] = React.useState<string>()
  const [enviando, iniciar] = React.useTransition()
  const regreso = sentido ? contrario(sentido) : null
  const elegirCuando = (c: typeof cuando) => (setCuando(c), setError(undefined))

  const publicar = (e: React.FormEvent) => {
    e.preventDefault()
    iniciar(async () => {
      if (!sentido) return setError("Elige hacia dónde vas.")
      const datos = new FormData()
      datos.set("sentido", sentido)
      datos.set("puestos", String(puestos))
      if (cuando === "hora") datos.set("hora", hora)
      else datos.set("minutos", cuando === "otro" ? otro : String(cuando))
      if (conVuelta) datos.set("vuelta", String(vuelta))
      const r = await publicarViaje(datos)
      setError(r.error)
      if (r.ok) router.replace("/n/chofer")
    })
  }

  return (
    <form onSubmit={publicar} className="flex flex-1 flex-col gap-5">
      {tiempos.aviso ? <p className="rounded-2xl bg-secondary px-3 py-2 text-sm text-muted-foreground">{tiempos.aviso}</p> : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">¿Hacia dónde vas?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SENTIDOS) as Sentido[]).map((s) => {
            const Icono = ICONOS[s]
            const activo = sentido === s
            return (
              <button
                key={s}
                type="button"
                aria-pressed={activo}
                onClick={() => (setSentido(s), setError(undefined))}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors",
                  activo ? "border-primary bg-primary/10 text-primary" : "bg-input/30 active:bg-muted"
                )}
              >
                <Icono className="size-5" />
                <span className="font-medium">{SENTIDOS[s].corto}</span>
                <span className={cn("text-xs", activo ? "text-primary/80" : "text-muted-foreground")}>Recoges {SENTIDOS[s].enRecogida}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">¿Cuántos puestos?</legend>
        <div className="grid grid-cols-4 gap-2">
          {PUESTOS.map((n) => (
            <Button
              key={n}
              type="button"
              size="lg"
              variant={puestos === n ? "default" : "outline"}
              aria-pressed={puestos === n}
              onClick={() => setPuestos(n)}
              className="font-heading text-base"
            >
              {n}
            </Button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">{tiempos.pregunta}</legend>
        <div className="flex flex-wrap gap-2">
          {tiempos.yaEstoy ? (
            <Chip activo={cuando === 0} onClick={() => elegirCuando(0)}>
              Ya estoy aquí
            </Chip>
          ) : null}
          {tiempos.rapidos.map((m) => (
            <Chip key={m} activo={cuando === m} onClick={() => elegirCuando(m)}>
              {m} min
            </Chip>
          ))}
          <Chip activo={cuando === "otro"} onClick={() => elegirCuando("otro")}>
            Otro
          </Chip>
          <Chip activo={cuando === "hora"} onClick={() => elegirCuando("hora")}>
            Hora fija
          </Chip>
        </div>
        {cuando === "otro" ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={240}
              value={otro}
              onChange={(e) => setOtro(e.target.value)}
              placeholder="Minutos"
              aria-label="Minutos hasta llegar"
              className="max-w-32"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">minutos</span>
          </div>
        ) : null}
        {cuando === "hora" ? (
          <div className="flex flex-col gap-1">
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} aria-label="Hora a la que llegas" className="max-w-40" autoFocus />
            <span className="text-xs text-muted-foreground">Si esa hora ya pasó hoy, es la de mañana.</span>
          </div>
        ) : null}
      </fieldset>

      {/* R61: la vuelta es el sentido contrario con los mismos puestos; solo se pregunta cuándo llega a recoger */}
      <section className="flex flex-col gap-3 rounded-2xl border p-3">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="block font-medium">Ida y vuelta</span>
            <span className="block text-xs text-muted-foreground">Publica también el regreso.</span>
          </span>
          <Switch checked={conVuelta} onCheckedChange={setConVuelta} />
        </label>
        {conVuelta ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm text-muted-foreground">
              ¿Cuánto después de salir vuelves a recoger{regreso ? ` ${SENTIDOS[regreso].enRecogida}` : ""}?
            </legend>
            <div className="flex flex-wrap gap-2">
              {VUELTA_MIN.map((m) => (
                <Chip key={m} activo={vuelta === m} onClick={() => setVuelta(m)}>
                  {m} min
                </Chip>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              La vuelta ({regreso ? SENTIDOS[regreso].hacia : "de regreso"}, {puestosTexto(puestos)}) se publica ya y empieza sola cuando sales.
            </p>
          </fieldset>
        ) : null}
      </section>

      <div className="mt-auto flex flex-col gap-2 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ErrorAccion error={error} />
        <Button type="submit" size="lg" disabled={enviando}>
          {enviando ? <Loader2 className="animate-spin" /> : null}
          {enviando ? "Publicando…" : modo === "cadena" ? "Dejar publicado" : "Publicar"}
        </Button>
      </div>
    </form>
  )
}

function Chip({ activo, children, ...props }: React.ComponentProps<"button"> & { activo: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        activo ? "border-primary bg-primary/10 text-primary" : "bg-input/30 text-muted-foreground active:bg-muted"
      )}
      {...props}
    >
      {children}
    </button>
  )
}
