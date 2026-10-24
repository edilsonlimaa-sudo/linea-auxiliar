"use client"

import { useId } from "react"

import { CampoTexto } from "@/components/formulario/campos"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { BANCOS, nombreBanco } from "@/lib/bancos"
import { cn } from "@/lib/utils"

/** Por qué se pide (R74): lo mismo en el registro y en Mi carnet */
export const POR_QUE_PAGO_MOVIL =
  "Para que tus pasajeros te paguen sin preguntarte: lo ven solo quienes van en tu carro (hasta 3 horas después) y copian los datos con un toque para pegarlos en la app del banco."

/**
 * Banco, teléfono y cédula del Pago Móvil (R74), con los nombres pmBanco / pmTelefono / pmCedula que lee
 * leerPagoMovil. En el registro el banco puede quedar en "Ahora no" (opcional).
 */
export function CamposPagoMovil({
  valores,
  errores,
  opcional = false,
}: {
  valores: { pmBanco?: string; pmTelefono?: string; pmCedula?: string }
  errores: Record<string, string>
  opcional?: boolean
}) {
  const id = useId()
  return (
    <>
      <Field data-invalid={Boolean(errores.pmBanco) || undefined}>
        <FieldLabel htmlFor={id}>Banco</FieldLabel>
        <select
          id={id}
          name="pmBanco"
          defaultValue={valores.pmBanco ?? ""}
          aria-invalid={Boolean(errores.pmBanco) || undefined}
          aria-describedby={errores.pmBanco ? `${id}-error` : undefined}
          className={cn(
            "h-10 w-full rounded-lg border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/60 aria-invalid:border-destructive"
          )}
        >
          <option value="">{opcional ? "Ahora no (lo agrego después)" : "Escoge tu banco"}</option>
          {Object.keys(BANCOS)
            .sort((a, b) => BANCOS[a].localeCompare(BANCOS[b]))
            .map((codigo) => (
              <option key={codigo} value={codigo}>
                {nombreBanco(codigo)}
              </option>
            ))}
        </select>
        {opcional && !errores.pmBanco && <FieldDescription>Puedes agregarlo o cambiarlo después en Mi carnet.</FieldDescription>}
        {errores.pmBanco && <FieldError id={`${id}-error`}>{errores.pmBanco}</FieldError>}
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoTexto
          etiqueta="Teléfono del Pago Móvil"
          name="pmTelefono"
          inputMode="tel"
          autoComplete="off"
          placeholder="0414-1234567"
          defaultValue={valores.pmTelefono}
          error={errores.pmTelefono}
        />
        <CampoTexto
          etiqueta="Cédula del Pago Móvil"
          name="pmCedula"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="V-12345678"
          defaultValue={valores.pmCedula}
          error={errores.pmCedula}
        />
      </div>
    </>
  )
}
