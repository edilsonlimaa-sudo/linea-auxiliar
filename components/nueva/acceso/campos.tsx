"use client"

import { AlertCircle, Eye, EyeOff } from "lucide-react"
import { useId, useState } from "react"

import { Input } from "@/components/nueva/ui/input"
import { BANCOS, nombreBanco } from "@/lib/bancos"
import { cn } from "@/lib/utils"

// Campos de Entrar / Crear cuenta / PIN nuevo con el aspecto de la nueva (R84). Misma accesibilidad que los de la clásica
// (components/formulario/campos.tsx): etiqueta, ayuda y error ligados con aria-describedby / aria-invalid.

type BaseCampo = { etiqueta: string; name: string; error?: string; ayuda?: string }

const ALTO = "h-11 rounded-2xl px-4 text-base md:text-base"

function Ayuda({ id, ayuda, error }: { id: string; ayuda?: string; error?: string }) {
  return (
    <>
      {ayuda ? (
        <p id={`${id}-ayuda`} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </>
  )
}

const describe = (id: string, ayuda?: string, error?: string) => cn(ayuda && `${id}-ayuda`, error && `${id}-error`) || undefined

export function CampoTexto({ etiqueta, name, error, ayuda, className, ...props }: BaseCampo & Omit<React.ComponentProps<"input">, "name">) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium">
        {etiqueta}
      </label>
      <Input
        id={id}
        name={name}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describe(id, ayuda, error)}
        className={cn(ALTO, className)}
        {...props}
      />
      <Ayuda id={id} ayuda={ayuda} error={error} />
    </div>
  )
}

/** PIN de 6 números con Ver / Ocultar (ayuda a quien escribe sin mirar el teclado) */
export function CampoPin({ etiqueta, name, error, ayuda, nuevo = false }: BaseCampo & { nuevo?: boolean }) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium">
        {etiqueta}
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          required
          autoComplete={nuevo ? "new-password" : "current-password"}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describe(id, ayuda, error)}
          className={cn(ALTO, "font-mono tracking-[0.4em]")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border bg-card px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          {visible ? "Ocultar" : "Ver"}
        </button>
      </div>
      <Ayuda id={id} ayuda={ayuda} error={error} />
    </div>
  )
}

/** Banco del Pago Móvil (R74): en el registro puede quedar en "Ahora no" */
export function CampoBanco({ error, defaultValue }: { error?: string; defaultValue?: string }) {
  const id = useId()
  const ayuda = error ? undefined : "Puedes agregarlo o cambiarlo después en Mi carnet."
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium">
        Banco
      </label>
      <select
        id={id}
        name="pmBanco"
        defaultValue={defaultValue ?? ""}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describe(id, ayuda, error)}
        className="h-11 w-full rounded-2xl border bg-input/30 px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
      >
        <option value="">Ahora no (lo agrego después)</option>
        {Object.keys(BANCOS)
          .sort((a, b) => BANCOS[a].localeCompare(BANCOS[b]))
          .map((codigo) => (
            <option key={codigo} value={codigo}>
              {nombreBanco(codigo)}
            </option>
          ))}
      </select>
      <Ayuda id={id} ayuda={ayuda} error={error} />
    </div>
  )
}

/** Error general del formulario (role=alert: useEnfocarError lo enfoca si no hay un campo con error) */
export function AvisoError({ texto }: { texto?: string }) {
  if (!texto) return null
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
      <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
      <p className="font-medium">{texto}</p>
    </div>
  )
}

/** Un grupo con título (Tu carro, Tu PIN…) */
export function Grupo({ titulo, detalle, children }: { titulo: string; detalle?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-(--sombra-card)">
      <legend className="sr-only">{titulo}</legend>
      <div aria-hidden>
        <p className="font-heading text-base font-semibold">{titulo}</p>
        {detalle ? <p className="mt-1 text-sm text-muted-foreground">{detalle}</p> : null}
      </div>
      {children}
    </fieldset>
  )
}
