"use client"

import { CalendarCheck, CheckCircle2, Clock, Loader2, ShieldCheck, Wallet } from "lucide-react"
import { useActionState, useEffect, useState } from "react"

import { useEnfocarError } from "@/components/formulario/campos"
import { AvisoError, Grupo } from "@/components/nueva/acceso/campos"
import { Button } from "@/components/nueva/ui/button"
import { Input } from "@/components/nueva/ui/input"
import { Textarea } from "@/components/nueva/ui/textarea"
import { marcarLeidasDeDestino } from "@/lib/acciones/notificaciones"
import { type EstadoSalidaFija, responderSalidaFija } from "@/lib/acciones/salida-fija"
import {
  COMPROMISOS,
  DIAS_SALIDA,
  HORARIOS_SALIDA,
  MAX_COMENTARIO,
  MAX_HORA_OTRA,
  nombreHorario,
  nombresDias,
  type RespuestaSalidaFija,
} from "@/lib/salida-fija"
import { cn } from "@/lib/utils"

const inicial: EstadoSalidaFija = {}

/** Opción que se marca como una tarjeta o una pastilla (radio o checkbox nativo, escondido) */
function Opcion({ tipo, name, value, marcada, onChange, children, className }: {
  tipo: "radio" | "checkbox"; name: string; value: string; marcada: boolean; onChange: () => void; children: React.ReactNode; className?: string
}) {
  return (
    <label
      className={cn(
        "cursor-pointer rounded-2xl border bg-card transition-colors has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
        className
      )}
    >
      <input type={tipo} name={name} value={value} checked={marcada} onChange={onChange} className="sr-only" />
      {children}
    </label>
  )
}

const ErrorCampo = ({ texto }: { texto?: string }) =>
  texto ? (
    <p role="alert" className="text-sm font-medium text-destructive">
      {texto}
    </p>
  ) : null

/**
 * R108: ¿te sirve la salida fija? Se llega desde el botón de una notificación (R88): al abrirla, esas notificaciones
 * cuentan como vistas. Una respuesta por persona: si ya respondió, el formulario viene con la suya para cambiarla.
 */
export function SalidaFija({ mia }: { mia: (RespuestaSalidaFija & { cuando: string }) | null }) {
  const [estado, accion, enviando] = useActionState(responderSalidaFija, inicial)
  const formulario = useEnfocarError(estado.intento)
  const v = estado.valores
  const e = estado.errores ?? {}
  const [editando, setEditando] = useState(false)

  const [compromiso, setCompromiso] = useState<string>((v?.compromiso as string) ?? mia?.compromiso ?? "")
  const [horario, setHorario] = useState<string>((v?.horario as string) ?? mia?.horario ?? "")
  const [dias, setDias] = useState<string[]>((v?.dias as string[]) ?? mia?.dias.map(String) ?? [])
  const no = compromiso === "no"

  useEffect(() => {
    void marcarLeidasDeDestino("/n/salida-fija")
  }, [])

  // Tras enviar: gracias, con la respuesta resumida. "Cambiar mi respuesta" vuelve al formulario
  const [enviadoEn, setEnviadoEn] = useState<number>()
  if (estado.ok && estado.intento !== enviadoEn) {
    setEnviadoEn(estado.intento)
    setEditando(false)
  }
  const mostrarGracias = estado.ok && !editando

  if (mostrarGracias) {
    return (
      <section role="status" className="flex flex-col items-center gap-3 rounded-3xl border bg-card p-6 text-center shadow-(--sombra-card)">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="font-heading text-2xl font-semibold">¡Gracias!</h2>
        <p className="text-muted-foreground">
          {no
            ? "Gracias por decirnos. Si cambias de idea, aquí puedes cambiar tu respuesta."
            : "Si se arma la salida, te escribimos por WhatsApp para contarte cómo será. Todavía no apartamos ningún puesto ni cobramos nada."}
        </p>
        <Button variant="outline" size="lg" className="mt-2 w-full" onClick={() => setEditando(true)}>
          Cambiar mi respuesta
        </Button>
      </section>
    )
  }

  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-(--sombra-card)">
        <p className="font-heading text-lg font-semibold">Una salida fija desde Gina, todas las tardes</p>
        <ul className="flex flex-col gap-2.5 text-sm">
          <li className="flex gap-3">
            <Clock aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>Un carro sale de Gina hacia Valle Grande a la misma hora, de lunes a viernes.</span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>Tu puesto está garantizado: sin hacer cola y sin quedarte en la parada.</span>
          </li>
          <li className="flex gap-3">
            <Wallet aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>Pagas la semana por adelantado al chofer, al mismo precio de siempre.</span>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">Antes de armarla queremos saber a quién le sirve. Responder no te compromete a nada todavía.</p>
      </section>

      {mia && !estado.intento ? (
        <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <CalendarCheck aria-hidden className="size-4 shrink-0" />
          Ya respondiste {mia.cuando}
          {mia.compromiso !== "no" && mia.horario ? ` · ${nombreHorario(mia.horario, mia.horarioOtro)}, ${nombresDias(mia.dias)}` : ""}. Puedes cambiarla.
        </p>
      ) : null}

      <AvisoError texto={estado.error} />

      <Grupo titulo="¿Te anotamos para la prueba?">
        <div className="flex flex-col gap-2">
          {COMPROMISOS.map((c) => (
            <Opcion key={c.id} tipo="radio" name="compromiso" value={c.id} marcada={compromiso === c.id} onChange={() => setCompromiso(c.id)} className="px-4 py-3">
              <span className="block font-medium">{c.nombre}</span>
              {c.detalle ? <span className="block text-sm text-muted-foreground">{c.detalle}</span> : null}
            </Opcion>
          ))}
        </div>
        <ErrorCampo texto={e.compromiso} />
      </Grupo>

      {!no ? (
        <>
          <Grupo titulo="¿A qué hora te sirve?" detalle="La hora en que sale el carro de Gina.">
            <div className="grid grid-cols-3 gap-2">
              {HORARIOS_SALIDA.map((h) => (
                <Opcion key={h.id} tipo="radio" name="horario" value={h.id} marcada={horario === h.id} onChange={() => setHorario(h.id)} className="px-2 py-3 text-center font-medium">
                  {h.nombre}
                </Opcion>
              ))}
            </div>
            <ErrorCampo texto={e.horario} />
            {horario === "otra" ? (
              <div className="flex flex-col gap-2">
                <label htmlFor="horario_otro" className="font-medium">
                  ¿A qué hora?
                </label>
                <Input
                  id="horario_otro"
                  name="horario_otro"
                  maxLength={MAX_HORA_OTRA}
                  placeholder="Ej.: 6:15 p. m."
                  defaultValue={(v?.horario_otro as string) ?? mia?.horarioOtro ?? ""}
                  aria-invalid={e.horario_otro ? true : undefined}
                  className="h-11 rounded-2xl px-4 text-base md:text-base"
                />
                <ErrorCampo texto={e.horario_otro} />
              </div>
            ) : null}
          </Grupo>

          <Grupo titulo="¿Qué días?" detalle="Marca todos los que te sirvan.">
            <div className="grid grid-cols-5 gap-2">
              {DIAS_SALIDA.map((d) => {
                const id = String(d.id)
                const marcada = dias.includes(id)
                return (
                  <Opcion
                    key={d.id}
                    tipo="checkbox"
                    name="dias"
                    value={id}
                    marcada={marcada}
                    onChange={() => setDias((x) => (marcada ? x.filter((y) => y !== id) : [...x, id]))}
                    className="py-3 text-center font-medium"
                  >
                    <span aria-hidden>{d.corto}</span>
                    <span className="sr-only">{d.nombre}</span>
                  </Opcion>
                )
              })}
            </div>
            <ErrorCampo texto={e.dias} />
          </Grupo>
        </>
      ) : null}

      <Grupo titulo="¿Algo más? (opcional)">
        <label htmlFor="comentario" className="sr-only">
          Comentario
        </label>
        <Textarea
          id="comentario"
          name="comentario"
          maxLength={MAX_COMENTARIO}
          rows={3}
          placeholder={no ? "Ej.: salgo a otra hora" : "Ej.: salgo del trabajo a las 5 en punto"}
          defaultValue={(v?.comentario as string) ?? mia?.comentario ?? ""}
          className="rounded-2xl text-base md:text-base"
        />
        <ErrorCampo texto={e.comentario} />
      </Grupo>

      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={enviando}>
        {enviando ? <Loader2 className="animate-spin" /> : null}
        {enviando ? "Enviando…" : mia ? "Guardar mi respuesta" : "Enviar mi respuesta"}
      </Button>
    </form>
  )
}
