"use client"

import { CheckCircle2, Loader2, Smartphone, Snowflake, Trash2 } from "lucide-react"
import * as React from "react"

import { POR_QUE_PAGO_MOVIL } from "@/components/pago-movil/campos-pago-movil"
import { ErrorAccion } from "@/components/nueva/chofer/comun"
import { Button } from "@/components/nueva/ui/button"
import { Input } from "@/components/nueva/ui/input"
import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { guardarPagoMovil, quitarPagoMovil } from "@/lib/acciones/pago-movil"
import { cambiarAire } from "@/lib/acciones/perfil"
import { BANCOS, type DatosPagoMovil, nombreBanco } from "@/lib/bancos"
import { formatearTelefono } from "@/lib/telefono"
import { cn } from "@/lib/utils"

/** "Mi carro tiene aire acondicionado" (R55): cambia al tocar; si falla, vuelve atrás */
export function AireInterruptor({ tiene }: { tiene: boolean }) {
  const [valor, setValor] = React.useOptimistic(tiene)
  const [pendiente, iniciar] = React.useTransition()
  const [error, setError] = React.useState<string>()
  const cambiar = (nuevo: boolean) =>
    iniciar(async () => {
      setError(undefined)
      setValor(nuevo)
      const r = await cambiarAire(nuevo)
      if (r.error) setError(r.error)
    })

  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center gap-3 rounded-3xl border bg-card p-4 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
        <Snowflake className={cn("size-5 shrink-0", valor ? "text-primary" : "text-muted-foreground")} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Aire acondicionado</span>
          <span className="block text-sm text-muted-foreground">{valor ? "Los pasajeros ven “Con aire”" : "Tu carro no tiene aire"}</span>
        </span>
        {pendiente ? <Loader2 className="size-4 animate-spin" /> : null}
        <input type="checkbox" role="switch" checked={valor} onChange={(e) => cambiar(e.target.checked)} className="sr-only" />
        <span
          aria-hidden
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors",
            valor ? "bg-primary" : "bg-muted-foreground/40",
            "after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition-transform",
            valor && "after:translate-x-5"
          )}
        />
      </label>
      <ErrorAccion error={error} />
    </div>
  )
}

const inicial: EstadoFormulario = {}

/** Mi Pago Móvil (R74): banco, teléfono y cédula; sin registrar, se sugieren los de su cuenta */
export function PagoMovilEditar({ actual, telefono, cedula }: { actual: DatosPagoMovil | null; telefono: string | null; cedula: string | null }) {
  const [estado, accion, guardando] = React.useActionState(guardarPagoMovil, inicial)
  const [quitando, iniciar] = React.useTransition()
  const [errorQuitar, setErrorQuitar] = React.useState<string>()
  const e = estado.errores ?? {}
  const v = estado.valores ?? {
    pmBanco: actual?.banco ?? "",
    pmTelefono: actual?.telefono ?? (telefono ? formatearTelefono(telefono) : ""),
    pmCedula: actual?.cedula ?? cedula ?? "",
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading font-semibold">Tu Pago Móvil</h2>
          <p className="text-sm text-muted-foreground">{POR_QUE_PAGO_MOVIL}</p>
        </div>
      </div>
      <form key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <span className="font-medium">Banco</span>
          <select
            name="pmBanco"
            defaultValue={v.pmBanco ?? ""}
            aria-invalid={e.pmBanco ? true : undefined}
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
          {e.pmBanco ? <span className="text-sm text-destructive">{e.pmBanco}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-medium">Teléfono del Pago Móvil</span>
          <Input name="pmTelefono" inputMode="tel" autoComplete="off" placeholder="0414-1234567" defaultValue={v.pmTelefono} aria-invalid={e.pmTelefono ? true : undefined} />
          {e.pmTelefono ? <span className="text-sm text-destructive">{e.pmTelefono}</span> : null}
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-medium">Cédula del Pago Móvil</span>
          <Input name="pmCedula" autoCapitalize="characters" autoComplete="off" placeholder="V-12345678" defaultValue={v.pmCedula} aria-invalid={e.pmCedula ? true : undefined} />
          {e.pmCedula ? <span className="text-sm text-destructive">{e.pmCedula}</span> : null}
        </label>
        <ErrorAccion error={estado.error} />
        {estado.valores?.guardado === "si" ? (
          <p role="status" className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="size-4" /> Guardado: tus pasajeros ya lo ven
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" size="lg" className="flex-1" disabled={guardando}>
            {guardando ? <Loader2 className="animate-spin" /> : null}
            {actual ? "Guardar cambios" : "Guardar mi Pago Móvil"}
          </Button>
          {actual ? (
            <Button
              type="button"
              size="lg"
              variant="destructive"
              disabled={quitando}
              onClick={() => iniciar(async () => setErrorQuitar((await quitarPagoMovil()).error))}
            >
              {quitando ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Quitar
            </Button>
          ) : null}
        </div>
        <ErrorAccion error={errorQuitar} />
      </form>
    </section>
  )
}
