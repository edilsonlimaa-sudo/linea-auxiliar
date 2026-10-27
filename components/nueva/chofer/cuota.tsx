"use client"

import { BadgeCheck, ChevronRight, Clock, Hourglass, Loader2, Lock, Send, XCircle } from "lucide-react"
import Link from "next/link"
import { useActionState } from "react"

import { PagoMovilCard } from "@/components/nueva/pasajero/pago-movil-card"
import { Button } from "@/components/nueva/ui/button"
import { Input } from "@/components/nueva/ui/input"
import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { avisarPagoCuota } from "@/lib/acciones/cuota"
import { BANCOS, bolivares, nombreBanco } from "@/lib/bancos"
import type { CuotaChofer } from "@/lib/datos/cuota"
import { cn } from "@/lib/utils"

/**
 * La cuota del día en Inicio (R76–R77). Habilitado: una línea discreta (pagada o en revisión). Sin habilitar: el aviso y
 * el botón, en lugar de publicar; el pago va en su pantalla.
 */
export function CuotaAviso({ cuota }: { cuota: CuotaChofer }) {
  const ultimo = cuota.avisos[0] ?? null

  if (cuota.habilitado) {
    const enRevision = ultimo?.estado === "revision"
    return (
      <Link
        href="/n/chofer/cuota"
        transitionTypes={["nav-forward"]}
        className="flex items-center gap-3 rounded-2xl bg-secondary px-3 py-2 text-sm transition-colors active:bg-muted"
      >
        {enRevision ? <Hourglass className="size-4 shrink-0 text-muted-foreground" /> : <BadgeCheck className="size-4 shrink-0 text-primary" />}
        <span className="min-w-0 flex-1 truncate">
          {enRevision ? "Cuota de hoy en revisión · ya puedes publicar" : "Cuota de hoy pagada"}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    )
  }

  const { icono, titulo, texto, boton } =
    ultimo?.estado === "revision"
      ? { icono: <Clock className="size-5" />, titulo: "Esperando la aprobación de tu pago", texto: "Podrás publicar viajes cuando el administrador lo apruebe.", boton: "Ver mi pago" }
      : ultimo?.estado === "rechazado"
        ? { icono: <XCircle className="size-5" />, titulo: "Tu pago de hoy fue rechazado", texto: "Mira por qué y, si fue un error, avisa otra vez.", boton: "Ver qué pasó" }
        : {
            icono: <Lock className="size-5" />,
            titulo: "Cuota del día",
            texto: `Paga ${bolivares(cuota.monto)} a la línea para publicar viajes, conectarte y ver la lista de Gina.`,
            boton: "Pagar la cuota",
          }

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-primary/30 bg-card p-4">
      <div className="flex items-start gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", ultimo?.estado === "rechazado" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
          {icono}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-semibold">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{texto}</p>
        </div>
      </div>
      <Button size="lg" variant={ultimo ? "outline" : "default"} render={<Link href="/n/chofer/cuota" transitionTypes={["nav-forward"]} />} nativeButton={false}>
        {boton}
      </Button>
    </section>
  )
}

const inicial: EstadoFormulario = {}

/**
 * La pantalla de la cuota (R76–R77). Habilitado o esperando: el aviso enviado. Sin habilitar: el Pago Móvil de la línea
 * con Copiar todo y el aviso de la referencia; si lo rechazaron, por qué y que el próximo aviso libera solo aprobado.
 */
export function CuotaPantalla({ cuota }: { cuota: CuotaChofer }) {
  const ultimo = cuota.avisos[0] ?? null

  if (cuota.habilitado || ultimo?.estado === "revision") {
    const { icono, titulo, texto } = cuota.habilitado
      ? ultimo?.estado === "revision"
        ? { icono: <Hourglass className="size-5" />, titulo: "Tu pago está en revisión", texto: "Ya puedes publicar tus viajes de hoy. El administrador lo revisa con su banco." }
        : { icono: <BadgeCheck className="size-5" />, titulo: "Cuota de hoy pagada", texto: "Puedes publicar todos tus viajes de hoy." }
      : { icono: <Clock className="size-5" />, titulo: "Esperando la aprobación de tu pago", texto: "Podrás publicar viajes cuando el administrador lo apruebe." }
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
        {cuota.habilitado ? (
          <Button size="lg" render={<Link href="/n/chofer" transitionTypes={["nav-back"]} />} nativeButton={false}>
            Ir a publicar
          </Button>
        ) : null}
      </section>
    )
  }

  const rechazado = ultimo?.estado === "rechazado" ? ultimo : null
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-2xl font-semibold">Para publicar hoy: {bolivares(cuota.monto)}</h2>
        <p className="text-sm text-muted-foreground">Págala por Pago Móvil y avisa la referencia. Vale por todos tus viajes de hoy.</p>
      </div>
      {rechazado ? (
        <div role="alert" className="flex gap-3 rounded-3xl bg-destructive/10 p-4 text-sm text-destructive">
          <XCircle className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Tu pago de hoy fue rechazado{rechazado.motivo ? `: ${rechazado.motivo}` : ""}.</strong> Si fue un error, avisa otra vez
            con la referencia correcta: esta vez se libera cuando el administrador lo apruebe.
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
        <p className="font-medium">2. Avisa tu pago</p>
        <FormAviso primero={!rechazado} />
      </div>
    </div>
  )
}

function FormAviso({ primero }: { primero: boolean }) {
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
        Ya pagué: avisar
      </Button>
      <p className="text-xs text-muted-foreground">
        {primero
          ? "Al avisar ya puedes publicar: el administrador revisa el pago después. Si no aparece en el banco, no podrás publicar más hoy."
          : "Esta vez puedes publicar cuando el administrador apruebe el pago."}
      </p>
    </form>
  )
}
