"use client"

import { BadgeCheck, ChevronRight, HandHeart, Hourglass, Info, Loader2, Send } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { useActionState } from "react"

import { marcarAporteHoyNo, useAporteHoyNo } from "@/components/chofer/aporte-hoy-no"
import { PagoMovilCard } from "@/components/nueva/pasajero/pago-movil-card"
import { Button } from "@/components/nueva/ui/button"
import { Input } from "@/components/nueva/ui/input"
import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { avisarPagoCuota } from "@/lib/acciones/cuota"
import { BANCOS, bolivares, nombreBanco } from "@/lib/bancos"
import type { CuotaChofer } from "@/lib/datos/cuota"

/**
 * El aporte del día en Inicio (R76–R77): voluntario, nunca bloquea. Ya aportó (o en revisión): una línea discreta de
 * gracias. Rechazado hoy: una línea discreta. Sin aporte: la invitación, debajo de Publicar (sin viajes abiertos), con
 * "Hoy no" hasta el día siguiente. El pago va en su pantalla. `parte` dice qué se pinta en ese lugar: la línea (arriba)
 * o la invitación (debajo de Publicar).
 */
export function CuotaAviso({ cuota, parte }: { cuota: CuotaChofer; parte: "fila" | "invitacion" }) {
  const hoyNo = useAporteHoyNo()
  const ultimo = cuota.avisos[0] ?? null
  const conFila = cuota.habilitado || ultimo !== null

  if (conFila !== (parte === "fila")) return null

  if (cuota.habilitado || ultimo?.estado === "revision") {
    const enRevision = !cuota.avisos.some((a) => a.estado === "aprobado")
    return (
      <Fila
        icono={enRevision ? <Hourglass className="size-4 shrink-0 text-muted-foreground" /> : <BadgeCheck className="size-4 shrink-0 text-primary" />}
        texto={enRevision ? "Tu aporte de hoy está en revisión · ¡gracias!" : "Gracias por tu aporte de hoy"}
      />
    )
  }

  if (ultimo?.estado === "rechazado") {
    return <Fila icono={<Info className="size-4 shrink-0 text-muted-foreground" />} texto="Tu aporte de hoy no apareció en el banco" />
  }

  if (hoyNo) return null

  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HandHeart className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-semibold">¿Aportas hoy a la app?</h2>
          <p className="text-sm text-muted-foreground">
            Con {bolivares(cuota.monto)} nos ayudas a mantener la Línea en el aire. Es voluntario: trabajas igual.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" render={<Link href="/n/chofer/cuota" transitionTypes={["nav-forward"]} />} nativeButton={false}>
          Aportar
        </Button>
        <Button type="button" variant="ghost" onClick={marcarAporteHoyNo}>
          Hoy no
        </Button>
      </div>
    </section>
  )
}

function Fila({ icono, texto }: { icono: ReactNode; texto: string }) {
  return (
    <Link
      href="/n/chofer/cuota"
      transitionTypes={["nav-forward"]}
      className="flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2 text-sm transition-colors active:bg-muted"
    >
      {icono}
      <span className="min-w-0 flex-1 truncate">{texto}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

const inicial: EstadoFormulario = {}

/**
 * La pantalla del aporte (R76–R77), voluntario. Ya aportó (aprobado o en revisión): las gracias y el aviso enviado. Si
 * no: el Pago Móvil de la línea con Copiar todo y el aviso de la referencia; si no apareció en el banco, el motivo.
 */
export function CuotaPantalla({ cuota }: { cuota: CuotaChofer }) {
  const ultimo = cuota.avisos[0] ?? null

  if (cuota.habilitado || ultimo?.estado === "revision") {
    const aprobado = cuota.avisos.some((a) => a.estado === "aprobado")
    const { icono, titulo, texto } = aprobado
      ? { icono: <BadgeCheck className="size-5" />, titulo: "¡Gracias por tu aporte de hoy!", texto: "Nos ayudas a mantener la Línea en el aire." }
      : { icono: <Hourglass className="size-5" />, titulo: "Tu aporte está en revisión", texto: "Gracias. El administrador lo confirma con su banco." }
    return (
      <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icono}</div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-semibold">{titulo}</h2>
            <p className="text-sm text-muted-foreground">{texto}</p>
          </div>
        </div>
        {ultimo ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-2xl bg-muted/60 px-3 py-2 text-sm">
            <dt className="text-muted-foreground">Referencia</dt>
            <dd className="font-mono font-medium">{ultimo.referencia}</dd>
            <dt className="text-muted-foreground">Desde</dt>
            <dd className="font-medium">{nombreBanco(ultimo.banco)}</dd>
            <dt className="text-muted-foreground">Monto</dt>
            <dd className="font-medium">{bolivares(ultimo.monto)}</dd>
          </dl>
        ) : null}
        <Button size="lg" variant="outline" render={<Link href="/n/chofer" transitionTypes={["nav-back"]} />} nativeButton={false}>
          Volver a Inicio
        </Button>
      </section>
    )
  }

  const rechazado = ultimo?.estado === "rechazado" ? ultimo : null
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold">Aporta {bolivares(cuota.monto)} a la línea</h2>
        <p className="text-sm text-muted-foreground">Es voluntario y nos ayuda a mantener la app en el aire. Vale por todo el día.</p>
      </div>
      {rechazado ? (
        <div role="status" className="flex gap-3 rounded-3xl bg-secondary p-4 text-sm">
          <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <p>
            Tu aporte de hoy no apareció en el banco{rechazado.motivo ? `: ${rechazado.motivo}` : ""}. Si fue un error, avisa otra vez con la
            referencia correcta.
          </p>
        </div>
      ) : null}
      {cuota.pagoMovil ? (
        <div className="flex flex-col gap-2">
          <p className="font-medium">1. Paga a la línea</p>
          <PagoMovilCard datos={cuota.pagoMovil} chofer="" titulo={`Pago Móvil de la línea · ${bolivares(cuota.monto)}`} />
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <p className="font-medium">2. Avisa tu aporte</p>
        <FormAviso />
      </div>
    </div>
  )
}

function FormAviso() {
  const [estado, accion, enviando] = useActionState(avisarPagoCuota, inicial)
  const e = estado.errores ?? {}
  const v = estado.valores ?? {}
  return (
    <form key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-4 rounded-3xl border bg-card p-4">
      <label className="flex flex-col gap-2">
        <span className="font-medium">Referencia del Pago Móvil</span>
        <Input name="referencia" inputMode="numeric" autoComplete="off" placeholder="Ej. 004512345678" defaultValue={v.referencia} aria-invalid={e.referencia ? true : undefined} />
        {e.referencia ? <span className="text-sm text-destructive">{e.referencia}</span> : null}
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-medium">Banco desde el que pagaste</span>
        <select
          name="banco"
          defaultValue={v.banco ?? ""}
          aria-invalid={e.banco ? true : undefined}
          className="h-11 w-full rounded-2xl border bg-input/30 px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
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
        {e.banco ? <span className="text-sm text-destructive">{e.banco}</span> : null}
      </label>
      {estado.error ? (
        <p role="alert" className="text-sm text-destructive">
          {estado.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={enviando}>
        {enviando ? <Loader2 className="animate-spin" /> : <Send />}
        Ya aporté: avisar
      </Button>
      <p className="text-xs text-muted-foreground">
        Gracias. El administrador lo confirma con su banco.
      </p>
    </form>
  )
}
