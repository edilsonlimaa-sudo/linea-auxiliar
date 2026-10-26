"use client"

import { CheckCircle2Icon, ClockIcon, HourglassIcon, Loader2Icon, SendIcon, XCircleIcon } from "lucide-react"
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
 * La página de la cuota del día (/cuota, R76–R77). Habilitado: el aviso de hoy (en revisión o pagado) y "Ir a
 * publicar". Esperando aprobación: el aviso enviado. Sin habilitar: cómo pagar (el Pago Móvil de la línea con Copiar
 * todo) y el aviso de la referencia; rechazado, por qué y que el próximo aviso solo libera aprobado.
 */
export function CuotaDia({ cuota }: { cuota: CuotaChofer }) {
  const ultimo = cuota.avisos[0] ?? null

  if (cuota.habilitado || ultimo?.estado === "revision") {
    const aviso = ultimo
    const { Icono, titulo, texto, clase } = cuota.habilitado
      ? aviso?.estado === "revision"
        ? { Icono: HourglassIcon, titulo: "Tu pago está en revisión", texto: "Ya puedes publicar tus viajes de hoy. El administrador lo revisa con su banco.", clase: "border-warning/50 bg-warning-muted" }
        : { Icono: CheckCircle2Icon, titulo: "Cuota de hoy pagada", texto: "Puedes publicar todos tus viajes de hoy.", clase: "border-success/40 bg-success-muted" }
      : { Icono: ClockIcon, titulo: "Esperando la aprobación de tu pago", texto: "Podrás publicar viajes cuando el administrador lo apruebe.", clase: "border-warning/50 bg-warning-muted" }
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
        {cuota.habilitado && (
          <Link href="/inicio" className={buttonVariants({ variant: "signal", size: "lg", className: "w-full" })}>
            Ir a publicar
          </Link>
        )}
      </section>
    )
  }

  const rechazado = ultimo?.estado === "rechazado" ? ultimo : null
  return (
    <section aria-labelledby="titulo-cuota" className="flex flex-col gap-4 rounded-2xl border-2 border-primary bg-card p-4 text-card-foreground">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Cuota del día</p>
        <h2 id="titulo-cuota" className="text-lg leading-tight font-bold">
          Para publicar hoy: {bolivares(cuota.monto)}
        </h2>
        <p className="text-muted-foreground">Págala por Pago Móvil y avisa la referencia. Vale por todos tus viajes de hoy.</p>
      </div>

      {rechazado && (
        <div role="alert" className="flex gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-destructive">
          <XCircleIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Tu pago de hoy fue rechazado{rechazado.motivo ? `: ${rechazado.motivo}` : ""}.</strong> No puedes publicar más
            viajes hoy. Si fue un error, avisa otra vez con la referencia correcta: esta vez se libera cuando el administrador lo
            apruebe.
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
        <p className="font-bold">2. Avisa tu pago</p>
        <FormAviso primero={!rechazado} />
      </div>
    </section>
  )
}

function FormAviso({ primero }: { primero: boolean }) {
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
        Ya pagué: avisar
      </Button>
      <p className="text-sm text-muted-foreground">
        {primero
          ? "Al avisar ya puedes publicar: el administrador revisa el pago después. Si no aparece en el banco, no podrás publicar más hoy."
          : "Esta vez puedes publicar cuando el administrador apruebe el pago."}
      </p>
    </form>
  )
}
