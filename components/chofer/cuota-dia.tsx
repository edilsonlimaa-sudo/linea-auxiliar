"use client"

import { CheckCircle2Icon, HourglassIcon, InfoIcon, Loader2Icon, SendIcon } from "lucide-react"
import Link from "next/link"
import { useActionState, useId } from "react"

import { CampoTexto, useEnfocarError } from "@/components/formulario/campos"
import { PagoMovilChofer } from "@/components/pago-movil/pago-movil-chofer"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { avisarPagoCuota } from "@/lib/acciones/cuota"
import { BANCOS, bolivares, nombreBanco } from "@/lib/bancos"
import type { CuotaChofer } from "@/lib/datos/cuota"
import { hora } from "@/lib/fechas"
import { cn } from "@/lib/utils"

const inicial: EstadoFormulario = {}

/**
 * La página del aporte del día (/cuota, R76–R77): voluntario, no abre ni cierra nada. Ya aportó (aprobado o en
 * revisión): las gracias y el aviso de hoy. Si no: cómo aportar (el Pago Móvil de la línea con Copiar todo) y el aviso
 * de la referencia; si no apareció en el banco, el motivo y que puede avisar otra vez.
 */
export function CuotaDia({ cuota }: { cuota: CuotaChofer }) {
  const ultimo = cuota.avisos[0] ?? null

  if (cuota.habilitado || ultimo?.estado === "revision") {
    const aviso = ultimo
    const aprobado = cuota.avisos.some((a) => a.estado === "aprobado")
    const { Icono, titulo, texto, clase } = aprobado
      ? { Icono: CheckCircle2Icon, titulo: "¡Gracias por tu aporte de hoy!", texto: "Nos ayudas a mantener la Línea en el aire.", clase: "border-success/40 bg-success-muted" }
      : { Icono: HourglassIcon, titulo: "Tu aporte está en revisión", texto: "Gracias. El administrador lo confirma con su banco.", clase: "border-border bg-muted" }
    return (
      <section aria-labelledby="titulo-cuota" className={cn("flex flex-col gap-3 rounded-2xl border-2 p-4", clase)}>
        <h2 id="titulo-cuota" className="flex items-center gap-2 text-lg leading-tight font-bold">
          <Icono aria-hidden className="size-5 shrink-0" />
          {titulo}
        </h2>
        <p>{texto}</p>
        {aviso && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-card px-3 py-2 text-sm">
            <dt className="text-muted-foreground">Referencia</dt>
            <dd className="font-mono font-bold">{aviso.referencia}</dd>
            <dt className="text-muted-foreground">Desde</dt>
            <dd className="font-bold">{nombreBanco(aviso.banco)}</dd>
            <dt className="text-muted-foreground">Avisaste</dt>
            <dd className="font-bold">a las {hora(aviso.creadoEn)} · {bolivares(aviso.monto)}</dd>
          </dl>
        )}
        <Link href="/inicio" className={buttonVariants({ variant: "outline", className: "w-full" })}>
          Volver a Inicio
        </Link>
      </section>
    )
  }

  const rechazado = ultimo?.estado === "rechazado" ? ultimo : null
  return (
    <section aria-labelledby="titulo-cuota" className="flex flex-col gap-4 rounded-2xl border-2 border-primary bg-card p-4 text-card-foreground">
      <div className="flex flex-col gap-1">
        <h2 id="titulo-cuota" className="text-lg leading-tight font-bold">
          Aporta {bolivares(cuota.monto)} a la línea
        </h2>
        <p className="text-muted-foreground">Es voluntario y nos ayuda a mantener la app en el aire. Vale por todo el día.</p>
      </div>

      {rechazado && (
        <div role="status" className="flex gap-2 rounded-2xl bg-muted px-4 py-3">
          <InfoIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p>
            Tu aporte de hoy no apareció en el banco{rechazado.motivo ? `: ${rechazado.motivo}` : ""}. Si fue un error, avisa otra vez con
            la referencia correcta.
          </p>
        </div>
      )}

      {cuota.pagoMovil && (
        <div className="flex flex-col gap-2">
          <p className="font-bold">1. Paga a la línea</p>
          <PagoMovilChofer datos={cuota.pagoMovil} chofer="" titulo={`Pago Móvil de la línea · ${bolivares(cuota.monto)}`} />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <p className="font-bold">2. Avisa tu aporte</p>
        <FormAviso />
      </div>
    </section>
  )
}

function FormAviso() {
  const [estado, accion, enviando] = useActionState(avisarPagoCuota, inicial)
  const formulario = useEnfocarError(estado.intento)
  const idBanco = useId()
  const e = estado.errores ?? {}
  const v = estado.valores ?? {}
  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-3">
      <CampoTexto
        etiqueta="Referencia del Pago Móvil"
        name="referencia"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Ej. 004512345678"
        defaultValue={v.referencia}
        error={e.referencia}
      />
      <Field data-invalid={Boolean(e.banco) || undefined}>
        <FieldLabel htmlFor={idBanco}>Banco desde el que pagaste</FieldLabel>
        <select
          id={idBanco}
          name="banco"
          defaultValue={v.banco ?? ""}
          aria-invalid={Boolean(e.banco) || undefined}
          aria-describedby={e.banco ? `${idBanco}-error` : undefined}
          className="h-10 w-full rounded-lg border-2 border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/60 aria-invalid:border-destructive"
        >
          <option value="">Escoge tu banco</option>
          {Object.keys(BANCOS)
            .sort((a, b) => BANCOS[a].localeCompare(BANCOS[b]))
            .map((codigo) => (
              <option key={codigo} value={codigo}>
                {nombreBanco(codigo)}
              </option>
            ))}
        </select>
        {e.banco && <FieldError id={`${idBanco}-error`}>{e.banco}</FieldError>}
      </Field>
      {estado.error && (
        <p role="alert" className="font-bold text-destructive">
          {estado.error}
        </p>
      )}
      <Button type="submit" variant="signal" size="lg" disabled={enviando} className="w-full">
        {enviando ? <Loader2Icon aria-hidden className="animate-spin" /> : <SendIcon aria-hidden />}
        Ya aporté: avisar
      </Button>
      <p className="text-sm text-muted-foreground">Gracias. El administrador lo confirma con su banco.</p>
    </form>
  )
}
