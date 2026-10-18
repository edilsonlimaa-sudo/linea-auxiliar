"use client"

import { AlertCircleIcon } from "lucide-react"
import { useActionState } from "react"

import { CampoPin, CampoTexto, useEnfocarError } from "@/components/formulario/campos"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { entrar, type EstadoFormulario } from "@/lib/acciones/cuenta"

const inicial: EstadoFormulario = {}

export function FormularioEntrar() {
  const [estado, accion, enviando] = useActionState(entrar, inicial)
  const formulario = useEnfocarError(estado.intento)
  const e = estado.errores ?? {}

  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-7">
      {estado.error && (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden />
          <AlertTitle>{estado.error}</AlertTitle>
        </Alert>
      )}
      <FieldGroup>
        <CampoTexto
          etiqueta="Celular (WhatsApp)"
          name="telefono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0414-1234567"
          defaultValue={estado.valores?.telefono}
          error={e.telefono}
          required
        />
        <CampoPin etiqueta="Tu PIN de 6 números" name="pin" error={e.pin} />
      </FieldGroup>
      <Button type="submit" variant="signal" size="lg" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  )
}
