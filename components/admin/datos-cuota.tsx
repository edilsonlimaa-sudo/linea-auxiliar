"use client"

import { CheckCircle2Icon, Loader2Icon } from "lucide-react"
import { useActionState } from "react"

import { CampoTexto, useEnfocarError } from "@/components/formulario/campos"
import { CamposPagoMovil } from "@/components/pago-movil/campos-pago-movil"
import { Button } from "@/components/ui/button"
import type { EstadoFormulario } from "@/lib/acciones/cuenta"
import { guardarCuota } from "@/lib/acciones/cuota"
import type { ConfigCuota } from "@/lib/datos/cuota"

const inicial: EstadoFormulario = {}

/** Los datos del cobro (R78): activa, desde qué día, monto y el Pago Móvil de la línea que ven los choferes */
export function DatosCuota({ config }: { config: ConfigCuota | null }) {
  const [estado, accion, guardando] = useActionState(guardarCuota, inicial)
  const formulario = useEnfocarError(estado.intento)
  const e = estado.errores ?? {}
  const v = estado.valores ?? {
    activa: config?.activa ? "si" : "",
    desde: config?.desde ?? "",
    monto: config ? String(config.monto) : "1000",
    pmBanco: config?.banco ?? "",
    pmTelefono: config?.telefono ?? "",
    pmCedula: config?.cedula ?? "",
  }

  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-4">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl bg-muted px-4 py-3 has-focus-visible:ring-[3px] has-focus-visible:ring-ring">
        <input type="checkbox" name="activa" value="si" defaultChecked={v.activa === "si"} className="size-6 shrink-0 accent-primary" />
        <span>
          <span className="block font-bold">Cobrar la cuota del día</span>
          <span className="block text-sm text-muted-foreground">Apagada, los choferes publican sin pagar.</span>
        </span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoTexto etiqueta="Desde el día" name="desde" type="date" defaultValue={v.desde} error={e.desde} />
        <CampoTexto etiqueta="Monto (Bs.)" name="monto" inputMode="decimal" defaultValue={v.monto} error={e.monto} />
      </div>
      <p className="font-bold">Tu Pago Móvil (a donde pagan los choferes)</p>
      <CamposPagoMovil valores={v} errores={e} />
      {estado.error && (
        <p role="alert" className="font-bold text-destructive">
          {estado.error}
        </p>
      )}
      {estado.valores?.guardado === "si" && (
        <p role="status" className="flex items-center gap-2 font-bold text-success">
          <CheckCircle2Icon aria-hidden className="size-5" /> Guardado
        </p>
      )}
      <Button type="submit" disabled={guardando} className="self-start">
        {guardando && <Loader2Icon aria-hidden className="animate-spin" />}
        Guardar los datos del cobro
      </Button>
    </form>
  )
}
