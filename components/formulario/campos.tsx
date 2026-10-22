"use client"

import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// Tras un envío con errores, lleva el foco al primer campo inválido (o al aviso general) y lo muestra.
// Así quien llenó el formulario de abajo hacia arriba ve qué falta sin buscarlo.
export function useEnfocarError(intento: number | undefined) {
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (!intento) return
    const destino =
      ref.current?.querySelector<HTMLElement>("[aria-invalid=true]") ??
      ref.current?.querySelector<HTMLElement>("[role=alert]")
    if (!destino) return
    if (destino.getAttribute("role") === "alert") destino.tabIndex = -1
    destino.focus()
    destino.scrollIntoView({ block: "center" })
  }, [intento])
  return ref
}

type BaseCampo = {
  etiqueta: string
  name: string
  error?: string
  ayuda?: string
}

// Campo de texto con etiqueta, ayuda y error accesibles (aria-describedby / aria-invalid)
export function CampoTexto({
  etiqueta,
  name,
  error,
  ayuda,
  ...props
}: BaseCampo & Omit<React.ComponentProps<"input">, "name">) {
  const id = useId()
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <Input
        id={id}
        name={name}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={cn(ayuda && `${id}-ayuda`, error && `${id}-error`) || undefined}
        {...props}
      />
      {ayuda && <FieldDescription id={`${id}-ayuda`}>{ayuda}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}

// PIN de 6 números con botón para verlo (ayuda a quien escribe sin mirar el teclado)
export function CampoPin({ nuevo = false, ...props }: BaseCampo & { nuevo?: boolean }) {
  return (
    <CampoOculto
      {...props}
      inputMode="numeric"
      pattern="\d{6}"
      maxLength={6}
      autoComplete={nuevo ? "new-password" : "current-password"}
      className="font-mono text-base tracking-[0.4em]"
    />
  )
}

// Contraseña (panel de administración) con botón para verla
export function CampoClave({ nueva = false, ...props }: BaseCampo & { nueva?: boolean }) {
  return <CampoOculto {...props} autoComplete={nueva ? "new-password" : "current-password"} />
}

function CampoOculto({
  etiqueta,
  name,
  error,
  ayuda,
  ...inputProps
}: BaseCampo & Omit<React.ComponentProps<"input">, "name" | "type">) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={cn(ayuda && `${id}-ayuda`, error && `${id}-error`) || undefined}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border-2 border-input bg-card px-3 text-base font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          {visible ? <EyeOffIcon className="size-5" aria-hidden /> : <EyeIcon className="size-5" aria-hidden />}
          {visible ? "Ocultar" : "Ver"}
        </button>
      </div>
      {ayuda && <FieldDescription id={`${id}-ayuda`}>{ayuda}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}

// Lista desplegable nativa (más fácil de usar en celulares que un menú personalizado)
export function CampoSeleccion({
  etiqueta,
  name,
  error,
  ayuda,
  opciones,
  defaultValue,
}: BaseCampo & { opciones: readonly string[]; defaultValue?: string }) {
  const id = useId()
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{etiqueta}</FieldLabel>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue || ""}
        required
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={cn(ayuda && `${id}-ayuda`, error && `${id}-error`) || undefined}
        className="h-10 w-full rounded-lg border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/60 aria-invalid:border-destructive"
      >
        <option value="" disabled>
          Escoge una opción
        </option>
        {opciones.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {ayuda && <FieldDescription id={`${id}-ayuda`}>{ayuda}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}
