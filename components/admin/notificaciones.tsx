"use client"

import { CheckCircle2Icon, SendIcon } from "lucide-react"
import { useId, useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { Avatar } from "@/components/foto/avatar"
import { Button } from "@/components/ui/button"
import { enviarNotificacion, retirarNotificacion } from "@/lib/acciones/notificaciones"
import type { EnLaNueva } from "@/lib/datos/interfaz"
import type { NotificacionEnviada } from "@/lib/datos/notificaciones"
import { fechaHora } from "@/lib/fechas"
import { TIPOS_NOTIFICACION, type TipoNotificacion } from "@/lib/notificaciones"
import { cn } from "@/lib/utils"

const MAX_TITULO = 60
const MAX_TEXTO = 280
const campo =
  "w-full rounded-lg border-2 border-input bg-card px-4 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/60"
const chip = (activo: boolean) =>
  cn(
    "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 font-bold has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring",
    activo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
  )

/**
 * Mandar una notificación (R88): tipo, título, texto y a quién, todos los pasajeros de la interfaz nueva o algunos.
 * Pide confirmar con el número de personas: una vez enviada no se edita (se puede retirar).
 */
export function NuevaNotificacion({ personas }: { personas: EnLaNueva[] }) {
  const id = useId()
  const [tipo, setTipo] = useState<TipoNotificacion>("aviso")
  const [titulo, setTitulo] = useState("")
  const [texto, setTexto] = useState("")
  const [todos, setTodos] = useState(true)
  const [escogidas, setEscogidas] = useState<string[]>([])
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string>()
  const [enviadas, setEnviadas] = useState<number>()
  const [pendiente, iniciar] = useTransition()

  const cuantas = todos ? personas.length : escogidas.length
  const falta = !titulo.trim() ? "Escribe el título." : !texto.trim() ? "Escribe el texto." : cuantas === 0 ? "Escoge al menos una persona." : null

  function revisar(e: React.FormEvent) {
    e.preventDefault()
    setEnviadas(undefined)
    setError(falta ?? undefined)
    if (!falta) setConfirmando(true)
  }

  const enviar = () =>
    iniciar(async () => {
      const r = await enviarNotificacion({ tipo, titulo, texto, ids: todos ? null : escogidas })
      setError(r.error)
      if (r.error) return
      setConfirmando(false)
      setEnviadas(r.enviadas)
      setTitulo("")
      setTexto("")
      setEscogidas([])
    })

  return (
    <form onSubmit={revisar} noValidate className="flex flex-col gap-4 rounded-2xl border-2 bg-card p-4">
      <h2 className="text-base font-bold">Mandar una notificación</h2>
      {enviadas !== undefined && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-success-muted px-4 py-3 font-bold text-success">
          <CheckCircle2Icon aria-hidden className="size-5 shrink-0" />
          Le llegó a {enviadas} {enviadas === 1 ? "persona" : "personas"}.
        </p>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">Tipo</legend>
        <div className="flex flex-wrap gap-2">
          {TIPOS_NOTIFICACION.map((t) => (
            <label key={t.id} className={chip(tipo === t.id)}>
              <input type="radio" name="tipo" value={t.id} checked={tipo === t.id} onChange={() => setTipo(t.id)} className="sr-only" />
              {t.titulo}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-titulo`} className="font-bold">
          Título
        </label>
        <input id={`${id}-titulo`} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={MAX_TITULO} className={campo} placeholder="Ej.: Hoy llueve fuerte" />
        <p className="text-right text-sm text-muted-foreground tabular-nums">
          {titulo.length}/{MAX_TITULO}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-texto`} className="font-bold">
          Texto
        </label>
        <textarea
          id={`${id}-texto`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={MAX_TEXTO}
          rows={4}
          className={campo}
          placeholder="Ej.: Después de las 5 p. m. salen menos carros. Si puedes, sal más temprano."
        />
        <p className="text-right text-sm text-muted-foreground tabular-nums">
          {texto.length}/{MAX_TEXTO}
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">Para</legend>
        <div className="flex flex-wrap gap-2">
          <label className={chip(todos)}>
            <input type="radio" name="para" checked={todos} onChange={() => setTodos(true)} className="sr-only" />
            Todos los pasajeros de la nueva ({personas.length})
          </label>
          <label className={chip(!todos)}>
            <input type="radio" name="para" checked={!todos} onChange={() => setTodos(false)} className="sr-only" />
            Escoger personas
          </label>
        </div>
        {!todos &&
          (personas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nadie está en la interfaz nueva todavía.</p>
          ) : (
            <ul className="flex flex-wrap gap-2 pt-1">
              {personas.map((p) => {
                const marcada = escogidas.includes(p.id)
                return (
                  <li key={p.id}>
                    <label className={cn("flex cursor-pointer items-center gap-2 rounded-full border-2 py-1 pr-3 pl-1 text-sm font-bold has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring", marcada ? "border-primary bg-primary/10" : "hover:bg-muted")}>
                      <input
                        type="checkbox"
                        checked={marcada}
                        onChange={() => setEscogidas((e) => (marcada ? e.filter((x) => x !== p.id) : [...e, p.id]))}
                        className="sr-only"
                      />
                      <Avatar url={p.fotoUrl} nombre={p.nombre} className="size-7 text-xs" />
                      {p.nombre}
                      {marcada ? <CheckCircle2Icon aria-hidden className="size-4 text-primary" /> : null}
                    </label>
                  </li>
                )
              })}
            </ul>
          ))}
        <p className="text-sm text-muted-foreground">Por ahora solo la reciben los pasajeros de la interfaz nueva.</p>
      </fieldset>

      {error && !confirmando && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" variant="signal" size="lg" disabled={pendiente} className="w-full sm:w-auto sm:self-start">
        <SendIcon aria-hidden />
        Enviar
      </Button>

      <Confirmar
        abierto={confirmando}
        onCambiar={setConfirmando}
        titulo={`¿Mandar a ${cuantas} ${cuantas === 1 ? "persona" : "personas"}?`}
        descripcion={`“${titulo.trim()}”. Una vez enviada no se puede editar; si hace falta, la retiras.`}
        confirmar="Sí, mandar"
        cancelar="No, revisar"
        variante="signal"
        ocupado={pendiente}
        error={error}
        onConfirmar={enviar}
      />
    </form>
  )
}

/** Las enviadas (R88): a cuántos llegó, cuántos la vieron, y Retirar */
export function NotificacionesEnviadas({ enviadas }: { enviadas: NotificacionEnviada[] }) {
  if (enviadas.length === 0) return <p className="text-muted-foreground">Todavía no mandaste ninguna.</p>
  return (
    <ul className="flex flex-col gap-3">
      {enviadas.map((n) => (
        <Enviada key={n.id} n={n} />
      ))}
    </ul>
  )
}

function Enviada({ n }: { n: NotificacionEnviada }) {
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()
  const retirada = n.retirada_en !== null
  const pct = n.destinatarios ? Math.round((n.vistas / n.destinatarios) * 100) : 0
  const tipo = TIPOS_NOTIFICACION.find((t) => t.id === n.tipo)?.titulo ?? n.tipo

  return (
    <li className={cn("flex flex-col gap-2 rounded-2xl border-2 bg-card p-4", retirada && "opacity-60")}>
      <p className="text-sm text-muted-foreground">
        {tipo} · {fechaHora(n.creada_en)}
        {retirada ? " · Retirada" : ""}
      </p>
      <p className="font-bold">{n.titulo}</p>
      <p className="whitespace-pre-line">{n.texto}</p>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <p className="flex-1 text-sm">
          Llegó a <b className="tabular-nums">{n.destinatarios}</b> · la {n.vistas === 1 ? "vio" : "vieron"}{" "}
          <b className="tabular-nums">{n.vistas}</b> <span className="text-muted-foreground">({pct}%)</span>
        </p>
        {!retirada && (
          <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
            Retirar
          </Button>
        )}
      </div>
      <Confirmar
        abierto={abierto}
        onCambiar={setAbierto}
        titulo="¿Retirar esta notificación?"
        descripcion="Desaparece para todos los que la recibieron, también para quienes no la han visto."
        confirmar="Sí, retirar"
        cancelar="No, dejarla"
        ocupado={pendiente}
        error={error}
        onConfirmar={() =>
          iniciar(async () => {
            const r = await retirarNotificacion(n.id)
            setError(r.error)
            if (!r.error) setAbierto(false)
          })
        }
      />
    </li>
  )
}
