"use client"

import { CheckCircle2Icon, Loader2Icon, SendIcon } from "lucide-react"
import { useActionState, useId } from "react"

import { useEnfocarError } from "@/components/formulario/campos"
import { Button } from "@/components/ui/button"
import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { enviarSugerencia } from "@/lib/acciones/sugerencias"

const inicial: EstadoFormulario = {}

/** Enviar una sugerencia al admin (R81): un texto, nada más */
export function FormSugerencia() {
  const [estado, accion, enviando] = useActionState(enviarSugerencia, inicial)
  const formulario = useEnfocarError(estado.intento)
  const id = useId()
  const enviada = estado.valores?.enviada === "si"
  const error = estado.errores?.texto

  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-3">
      {enviada && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-success-muted px-4 py-3 font-bold text-success">
          <CheckCircle2Icon aria-hidden className="size-5 shrink-0" />
          ¡Gracias! Le llegó al administrador.
        </p>
      )}
      <label htmlFor={id} className="font-bold">
        {enviada ? "¿Algo más?" : "¿Qué mejorarías de la línea o de la app?"}
      </label>
      <textarea
        id={id}
        name="texto"
        rows={5}
        maxLength={1000}
        defaultValue={enviada ? "" : estado.valores?.texto}
        placeholder="Ej.: que la app avise cuando el carro esté cerca"
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full rounded-lg border-2 border-input bg-card px-4 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/60 aria-invalid:border-destructive"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      {estado.error && (
        <p role="alert" className="font-bold text-destructive">
          {estado.error}
        </p>
      )}
      <Button type="submit" variant="signal" size="lg" disabled={enviando} className="w-full">
        {enviando ? <Loader2Icon aria-hidden className="animate-spin" /> : <SendIcon aria-hidden />}
        Enviar sugerencia
      </Button>
    </form>
  )
}
