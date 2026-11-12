import { CalendarClockIcon, MessageCircleIcon } from "lucide-react"
import type { Metadata } from "next"

import { buttonVariants } from "@/components/ui/button"
import { cargarRespuestasSalidaFija, type RespuestaAdmin } from "@/lib/datos/salida-fija"
import { COMPROMISOS, nombreHorario, nombresDias, PUESTOS_POR_CARRO } from "@/lib/salida-fija"
import { exigirAdmin } from "@/lib/sesion"
import { formatearTelefono } from "@/lib/telefono"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Salida fija · Administración" }

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(new Date(iso))

const ETIQUETA: Record<RespuestaAdmin["compromiso"], { texto: string; clase: string }> = {
  si: { texto: "Sí, paga la semana", clase: "bg-success-muted text-success" },
  luego: { texto: "Más adelante", clase: "bg-warning-muted text-foreground" },
  no: { texto: "No le sirve", clase: "bg-muted text-muted-foreground" },
}

// La salida fija (docs/especificacion.md §5.28, R109): quién respondió la encuesta, cuántos sí por horario y WhatsApp
export default async function PaginaSalidaFija() {
  await exigirAdmin()
  const { respuestas, error } = await cargarRespuestasSalidaFija()
  const si = respuestas.filter((r) => r.compromiso === "si")
  const cuenta = (c: RespuestaAdmin["compromiso"]) => respuestas.filter((r) => r.compromiso === c).length

  // Los "sí" por horario (los de "Otra hora", cada uno con lo que escribió)
  const porHorario = new Map<string, RespuestaAdmin[]>()
  si.forEach((r) => {
    const clave = nombreHorario(r.horario, r.horarioOtro)
    porHorario.set(clave, [...(porHorario.get(clave) ?? []), r])
  })
  const horarios = [...porHorario.entries()].sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Salida fija</h1>
        <p className="text-muted-foreground">
          Respuestas a la encuesta de la salida fija desde Gina (se llega con el botón de una notificación). Con{" "}
          {PUESTOS_POR_CARRO} que dicen que sí en un mismo horario se llena un carro.
        </p>
      </div>

      {error ? <p className="rounded-2xl border-2 border-destructive p-4 text-destructive">{error}</p> : null}

      <div className="grid grid-cols-3 gap-3">
        {COMPROMISOS.map((c) => (
          <div key={c.id} className="rounded-2xl border-2 bg-card p-4">
            <p className="text-3xl font-bold tabular-nums">{cuenta(c.id)}</p>
            <p className="text-sm text-muted-foreground">{ETIQUETA[c.id].texto}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Los que dicen que sí, por horario</h2>
        {horarios.length === 0 ? <p className="text-muted-foreground">Nadie dijo que sí todavía.</p> : null}
        <ul className="grid gap-3 md:grid-cols-2">
          {horarios.map(([horario, lista]) => {
            const lleno = lista.length >= PUESTOS_POR_CARRO
            return (
              <li key={horario} className={cn("flex flex-col gap-2 rounded-2xl border-2 bg-card p-4", lleno && "border-success")}>
                <p className="flex items-center gap-2 font-bold">
                  <CalendarClockIcon aria-hidden className="size-5 text-primary" />
                  {horario}
                  <span className="ml-auto tabular-nums">
                    {lista.length}/{PUESTOS_POR_CARRO}
                  </span>
                </p>
                {lleno ? <p className="text-sm font-bold text-success">Ya se llena un carro</p> : null}
                <p className="text-sm text-muted-foreground">{lista.map((r) => r.nombre).join(", ")}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Todas las respuestas ({respuestas.length})</h2>
        {respuestas.length === 0 ? <p className="text-muted-foreground">Todavía nadie respondió.</p> : null}
        {respuestas.map((r) => (
          <article key={r.personaId} className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-bold">{r.nombre}</p>
              <p className="text-sm text-muted-foreground">{fecha(r.actualizadaEn)}</p>
            </div>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className={cn("rounded-full px-3 py-0.5 font-bold", ETIQUETA[r.compromiso].clase)}>{ETIQUETA[r.compromiso].texto}</span>
              {r.compromiso !== "no" ? (
                <span>
                  {nombreHorario(r.horario, r.horarioOtro)} · {nombresDias(r.dias)}
                </span>
              ) : null}
            </p>
            {r.comentario ? <p className="text-sm text-muted-foreground italic">“{r.comentario}”</p> : null}
            {r.telefono ? (
              <a
                href={`https://wa.me/${r.telefono.slice(1)}?text=${encodeURIComponent(`Hola ${r.nombre.split(" ")[0]}, te escribo de la Línea Auxiliar por la salida fija desde Gina.`)}`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "whatsapp", size: "sm", className: "w-fit" })}
              >
                <MessageCircleIcon aria-hidden /> {formatearTelefono(r.telefono)}
              </a>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  )
}
