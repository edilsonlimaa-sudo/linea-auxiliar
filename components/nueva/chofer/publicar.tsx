"use client"

import { Check, Loader2, Minus, Plus, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { ErrorAccion, Opcion, puestosTexto } from "@/components/nueva/chofer/comun"
import { Button } from "@/components/nueva/ui/button"
import { Input } from "@/components/nueva/ui/input"
import { publicarViaje } from "@/lib/acciones/chofer"
import { contrario, SENTIDOS, type Sentido } from "@/lib/viajes"

/**
 * Cómo se pregunta el tiempo (reglas de components/chofer/publicar-viaje.tsx):
 * - primero: sin viajes → "¿Cuándo llegas a recoger?" (con "Ya estoy aquí")
 * - cadena: con una recogida en curso → cuánto tarda DESPUÉS de salir (R11–R12)
 * - desde_ruta: solo va en ruta → empieza ya en camino (sin "Ya estoy aquí")
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

/**
 * Publicar un viaje (R10) o agregarlo a la cadena (R11). Todo se toca; solo "Otro" y "A una hora" piden escribir. El
 * sentido nunca viene escogido (R10); los puestos, los del último viaje. Ida y vuelta (R61) publica también la vuelta.
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
  const [vuelta, setVuelta] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string>()
  const [enviando, iniciar] = React.useTransition()
  const regreso = sentido ? contrario(sentido) : null

  const publicar = (e: React.FormEvent) => {
    e.preventDefault()
    iniciar(async () => {
      if (!sentido) return setError("Escoge hacia dónde vas.")
      if (conVuelta && vuelta === null) return setError("Escoge cuánto tardas en llegar a recoger para la vuelta.")
      const datos = new FormData()
      datos.set("sentido", sentido)
      datos.set("puestos", String(puestos))
      if (cuando === "hora") datos.set("hora", hora)
      else datos.set("minutos", cuando === "otro" ? otro : String(cuando))
      if (conVuelta && vuelta !== null) datos.set("vuelta", String(vuelta))
      const r = await publicarViaje(datos)
      setError(r.error)
      if (r.ok) router.replace("/n/chofer")
    })
  }

  return (
    <form onSubmit={publicar} className="flex flex-1 flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-heading text-lg font-semibold">¿Hacia dónde vas?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SENTIDOS) as Sentido[]).map((s) => (
            <Opcion key={s} nombre="sentido" elegida={sentido === s} onElegir={() => (setSentido(s), setError(undefined))} className="min-h-16 font-heading text-base">
              {sentido === s ? <Check className="size-5" /> : null}
              {SENTIDOS[s].corto}
            </Opcion>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{sentido ? `Recoges ${SENTIDOS[sentido].enRecogida}.` : "Toca hacia dónde vas."}</p>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-heading text-lg font-semibold">¿Cuántos puestos llevas?</legend>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon-lg" aria-label="Un puesto menos" disabled={puestos <= 1} onClick={() => setPuestos((p) => p - 1)}>
            <Minus />
          </Button>
          <output aria-live="polite" className="min-w-16 text-center font-heading text-4xl font-semibold tabular-nums">
            {puestos}
          </output>
          <Button type="button" variant="outline" size="icon-lg" aria-label="Un puesto más" disabled={puestos >= 8} onClick={() => setPuestos((p) => p + 1)}>
            <Plus />
          </Button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-heading text-lg font-semibold">{tiempos.pregunta}</legend>
        {tiempos.ayuda ? <p className="-mt-1 text-sm text-muted-foreground">{tiempos.ayuda}</p> : null}
        <div className="grid grid-cols-3 gap-2">
          {tiempos.yaEstoy ? (
            <Opcion nombre="cuando" elegida={cuando === 0} onElegir={() => setCuando(0)} className="col-span-3">
              Ya estoy aquí
            </Opcion>
          ) : null}
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
        {cuando === "otro" ? (
          <label className="flex items-center gap-3">
            <Input type="number" inputMode="numeric" min={1} max={240} value={otro} onChange={(e) => setOtro(e.target.value)} autoFocus className="w-28 text-center" />
            <span className="font-medium">minutos</span>
          </label>
        ) : null}
        {cuando === "hora" ? (
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-3">
              <span className="font-medium">Llego a las</span>
              <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} autoFocus className="w-36" />
            </span>
            <span className="text-xs text-muted-foreground">Si esa hora ya pasó hoy, es la de mañana.</span>
          </label>
        ) : null}
      </fieldset>

      {/* R61: la vuelta es el sentido contrario con los mismos puestos; solo se pregunta cuándo llega a recoger */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-heading text-lg font-semibold">¿Después recoges gente {regreso ? SENTIDOS[regreso].enRecogida : "allá"} para volver?</legend>
        <div className="grid grid-cols-2 gap-2">
          <Opcion nombre="vuelta" elegida={!conVuelta} onElegir={() => (setConVuelta(false), setVuelta(null))}>
            Solo ida
          </Opcion>
          <Opcion nombre="vuelta" elegida={conVuelta} onElegir={() => setConVuelta(true)}>
            Ida y vuelta
          </Opcion>
        </div>
        {conVuelta ? (
          <div className="mt-2 flex flex-col gap-2">
            <p className="font-medium">¿Cuánto tardas en llegar a recoger {regreso ? SENTIDOS[regreso].enRecogida : "allá"} después de salir?</p>
            <div className="grid grid-cols-2 gap-2">
              {[15, 20, 30, 45].map((m) => (
                <Opcion key={m} nombre="vuelta-min" elegida={vuelta === m} onElegir={() => setVuelta(m)}>
                  {m} min
                </Opcion>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              La vuelta ({regreso ? SENTIDOS[regreso].hacia : "de regreso"}, {puestosTexto(puestos)}) se publica ya y empieza sola cuando sales.
            </p>
          </div>
        ) : null}
      </fieldset>

      <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 border-t bg-background/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        <ErrorAccion error={error} />
        <Button type="submit" size="lg" disabled={enviando}>
          {enviando ? <Loader2 className="animate-spin" /> : <Send />}
          {enviando ? "Publicando…" : conVuelta ? "Publicar ida y vuelta" : modo === "cadena" ? "Agregar como próximo viaje" : "Publicar viaje"}
        </Button>
      </div>
    </form>
  )
}
