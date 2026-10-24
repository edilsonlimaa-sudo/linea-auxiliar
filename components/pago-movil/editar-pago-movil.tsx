"use client"

import { CheckCircle2Icon, Loader2Icon, SmartphoneIcon, Trash2Icon } from "lucide-react"
import { useActionState, useState, useTransition } from "react"

import { useEnfocarError } from "@/components/formulario/campos"
import { CamposPagoMovil, POR_QUE_PAGO_MOVIL } from "@/components/pago-movil/campos-pago-movil"
import { Button } from "@/components/ui/button"
import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { guardarPagoMovil, quitarPagoMovil } from "@/lib/acciones/pago-movil"
import type { DatosPagoMovil } from "@/lib/bancos"
import { formatearTelefono } from "@/lib/telefono"

const inicial: EstadoFormulario = {}

/**
 * Mi Pago Móvil (R74), en Mi carnet del chofer: banco, teléfono y cédula. Sin registrar, se sugieren su teléfono y su
 * cédula. Con el porqué a la vista.
 */
export function EditarPagoMovil({
  actual,
  telefono,
  cedula,
}: {
  actual: DatosPagoMovil | null
  telefono: string | null // el de su cuenta (+58…), para sugerirlo
  cedula: string | null
}) {
  const [estado, accion, guardando] = useActionState(guardarPagoMovil, inicial)
  const formulario = useEnfocarError(estado.intento)
  const [quitando, iniciar] = useTransition()
  const [errorQuitar, setErrorQuitar] = useState<string>()
  const v = estado.valores ?? {
    pmBanco: actual?.banco ?? "",
    pmTelefono: actual?.telefono ?? (telefono ? formatearTelefono(telefono) : ""),
    pmCedula: actual?.cedula ?? cedula ?? "",
  }

  return (
    <section aria-labelledby="titulo-pago-movil" className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
      <h2 id="titulo-pago-movil" className="flex items-center gap-2 text-base font-bold">
        <SmartphoneIcon aria-hidden className="size-5 text-primary" />
        Tu Pago Móvil
      </h2>
      <p className="text-sm text-muted-foreground">{POR_QUE_PAGO_MOVIL}</p>
      <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-3">
        <CamposPagoMovil valores={v} errores={estado.errores ?? {}} />
        {estado.error && (
          <p role="alert" className="font-bold text-destructive">
            {estado.error}
          </p>
        )}
        {estado.valores?.guardado === "si" && (
          <p role="status" className="flex items-center gap-2 font-bold text-success">
            <CheckCircle2Icon aria-hidden className="size-5" /> Guardado: tus pasajeros ya lo ven
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={guardando} className="flex-1">
            {guardando && <Loader2Icon aria-hidden className="animate-spin" />}
            {actual ? "Guardar cambios" : "Guardar mi Pago Móvil"}
          </Button>
          {actual && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              disabled={quitando}
              onClick={() =>
                iniciar(async () => {
                  const r = await quitarPagoMovil()
                  setErrorQuitar(r.error)
                })
              }
            >
              {quitando ? <Loader2Icon aria-hidden className="animate-spin" /> : <Trash2Icon aria-hidden />}
              Quitar
            </Button>
          )}
        </div>
        {errorQuitar && (
          <p role="alert" className="font-bold text-destructive">
            {errorQuitar}
          </p>
        )}
      </form>
    </section>
  )
}
