"use client"

import { AlertCircleIcon } from "lucide-react"
import { useActionState } from "react"

import { CampoPin, CampoTexto, useEnfocarError } from "@/components/formulario/campos"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CamposPagoMovil, POR_QUE_PAGO_MOVIL } from "@/components/pago-movil/campos-pago-movil"
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field"
import { registrarse, type EstadoFormulario } from "@/lib/acciones/cuenta"

const inicial: EstadoFormulario = {}

export function FormularioRegistro({ rol }: { rol: "pasajero" | "chofer" }) {
  const [estado, accion, enviando] = useActionState(registrarse, inicial)
  const formulario = useEnfocarError(estado.intento)
  const v = estado.valores ?? {}
  const e = estado.errores ?? {}

  return (
    // key: tras un error se vuelve a montar con lo que la persona ya había escrito
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-7">
      <input type="hidden" name="rol" value={rol} />

      {estado.error && (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden />
          <AlertTitle>{estado.error}</AlertTitle>
        </Alert>
      )}

      <FieldGroup>
        <CampoTexto
          etiqueta="Nombre y apellido"
          name="nombre"
          autoComplete="name"
          placeholder="Ej. María González"
          defaultValue={v.nombre}
          error={e.nombre}
          required
        />
        <CampoTexto
          etiqueta="Celular (WhatsApp)"
          name="telefono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0414-1234567"
          defaultValue={v.telefono}
          error={e.telefono}
          ayuda="Con este número vas a entrar a la app."
          required
        />
        {rol === "pasajero" && (
          <CampoTexto
            etiqueta="¿Dónde vives? (opcional)"
            name="urbanismo"
            placeholder="Ej.: Valle Grande Country"
            maxLength={60}
            autoComplete="off"
            defaultValue={v.urbanismo}
            error={e.urbanismo}
            ayuda="El nombre del urbanismo o sector."
          />
        )}
      </FieldGroup>

      {rol === "chofer" && (
        <FieldSet>
          <FieldLegend>Tu carro</FieldLegend>
          <FieldGroup>
            <CampoTexto
              etiqueta="Placa"
              name="placa"
              autoCapitalize="characters"
              placeholder="AB123CD"
              defaultValue={v.placa}
              error={e.placa}
              className="font-mono uppercase tracking-widest"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto etiqueta="N° de unidad" name="unidad" inputMode="numeric" placeholder="07" defaultValue={v.unidad} error={e.unidad} />
              <CampoTexto etiqueta="Color" name="color" placeholder="Gris" defaultValue={v.color} error={e.color} />
            </div>
            <CampoTexto etiqueta="Modelo" name="modelo" placeholder="Chevrolet Aveo" defaultValue={v.modelo} error={e.modelo} />
            {/* R55: los pasajeros lo ven en cada unidad */}
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border-2 bg-card px-4 py-3 has-focus-visible:ring-[3px] has-focus-visible:ring-ring">
              <input type="checkbox" name="aire" value="si" defaultChecked={v.aire === "si"} className="size-6 shrink-0 accent-primary" />
              <span className="font-bold">Mi carro tiene aire acondicionado</span>
            </label>
          </FieldGroup>
        </FieldSet>
      )}

      {/* R74: opcional, con el porqué a la vista */}
      {rol === "chofer" && (
        <FieldSet>
          <FieldLegend>Tu Pago Móvil (opcional)</FieldLegend>
          <FieldDescription>{POR_QUE_PAGO_MOVIL}</FieldDescription>
          <FieldGroup>
            <CamposPagoMovil valores={v} errores={e} opcional />
          </FieldGroup>
        </FieldSet>
      )}

      <FieldSet>
        <FieldLegend>Tu PIN para entrar</FieldLegend>
        <FieldGroup>
          <CampoPin etiqueta="Crea un PIN de 6 números" name="pin" nuevo error={e.pin} ayuda="Guárdalo bien: lo usarás cada vez que entres." />
          <CampoPin etiqueta="Repite el PIN" name="pinConfirmado" nuevo error={e.pinConfirmado} />
        </FieldGroup>
      </FieldSet>

      <CampoTexto
        etiqueta="Cédula (opcional)"
        name="cedula"
        inputMode="numeric"
        placeholder="V-12345678"
        defaultValue={v.cedula}
        error={e.cedula}
        ayuda="Ayuda a que el administrador te verifique más rápido. Solo la ve el administrador."
      />

      <Button type="submit" variant="signal" size="lg" disabled={enviando}>
        {enviando ? "Creando tu cuenta…" : "Crear mi cuenta"}
      </Button>
    </form>
  )
}
