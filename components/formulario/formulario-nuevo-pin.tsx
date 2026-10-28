"use client"

import { AlertCircleIcon } from "lucide-react"
import { useActionState } from "react"

import { CampoPin, useEnfocarError } from "@/components/formulario/campos"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { escogerMiPin, type EstadoFormulario } from "@/lib/acciones/cuenta"

const inicial: EstadoFormulario = {}

/** R4: escoger el PIN propio después del temporal */
export function FormularioNuevoPin() {
  const [estado, accion, enviando] = useActionState(escogerMiPin, inicial)
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
        <CampoPin etiqueta="Tu PIN nuevo (6 números)" name="pin" nuevo error={e.pin} ayuda="Uno fácil de recordar para ti, pero no tu fecha de nacimiento." />
        <CampoPin etiqueta="Repite el PIN" name="pinConfirmado" nuevo error={e.pinConfirmado} />
      </FieldGroup>
      <Button type="submit" variant="signal" size="lg" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar mi PIN"}
      </Button>
    </form>
  )
}
