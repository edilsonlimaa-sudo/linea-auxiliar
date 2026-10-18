"use client"

import { AlertCircleIcon } from "lucide-react"
import { useActionState } from "react"

import { CampoClave, CampoTexto, useEnfocarError } from "@/components/formulario/campos"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { cambiarClaveAdmin, entrarAdmin } from "@/lib/acciones/admin"
import type { EstadoFormulario } from "@/lib/acciones/cuenta"

const inicial: EstadoFormulario = {}

function AvisoError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null
  return (
    <Alert variant="destructive">
      <AlertCircleIcon aria-hidden />
      <AlertTitle>{mensaje}</AlertTitle>
    </Alert>
  )
}

export function FormularioEntrarAdmin() {
  const [estado, accion, enviando] = useActionState(entrarAdmin, inicial)
  const formulario = useEnfocarError(estado.intento)
  const e = estado.errores ?? {}
  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-7">
      <AvisoError mensaje={estado.error} />
      <FieldGroup>
        <CampoTexto
          etiqueta="Usuario"
          name="usuario"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={estado.valores?.usuario}
          error={e.usuario}
          required
        />
        <CampoClave etiqueta="Contraseña" name="clave" error={e.clave} />
      </FieldGroup>
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar al panel"}
      </Button>
    </form>
  )
}

export function FormularioCambiarClave() {
  const [estado, accion, enviando] = useActionState(cambiarClaveAdmin, inicial)
  const formulario = useEnfocarError(estado.intento)
  const e = estado.errores ?? {}
  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-7">
      <AvisoError mensaje={estado.error} />
      <FieldGroup>
        <CampoClave etiqueta="Nueva contraseña" name="clave" nueva error={e.clave} ayuda="Al menos 8 caracteres. Evita fechas o nombres fáciles de adivinar." />
        <CampoClave etiqueta="Repite la nueva contraseña" name="claveConfirmada" nueva error={e.claveConfirmada} />
      </FieldGroup>
      <Button type="submit" variant="signal" size="lg" disabled={enviando}>
        {enviando ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  )
}
