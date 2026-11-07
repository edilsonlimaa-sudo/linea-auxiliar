"use client"

import { Loader2, LogOut } from "lucide-react"
import { useActionState } from "react"

import { useEnfocarError } from "@/components/formulario/campos"
import { AvisoError, CampoBanco, CampoPin, CampoTexto, Grupo } from "@/components/nueva/acceso/campos"
import { Button } from "@/components/nueva/ui/button"
import { POR_QUE_PAGO_MOVIL } from "@/components/pago-movil/campos-pago-movil"
import { entrar, escogerMiPin, registrarse, salir, type EstadoFormulario } from "@/lib/acciones/cuenta"

// Entrar, Crear cuenta y PIN nuevo con el aspecto de la nueva (§5.21 R84): mismas acciones y campos que los de la clásica
// (components/formulario/*). Tras un error, `key` vuelve a montar el formulario con lo escrito y el foco va al primer error.

const inicial: EstadoFormulario = {}

function Enviar({ enviando, texto, enviandoTexto }: { enviando: boolean; texto: string; enviandoTexto: string }) {
  return (
    <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={enviando}>
      {enviando ? <Loader2 className="animate-spin" /> : null}
      {enviando ? enviandoTexto : texto}
    </Button>
  )
}

export function FormularioEntrar() {
  const [estado, accion, enviando] = useActionState(entrar, inicial)
  const formulario = useEnfocarError(estado.intento)
  const e = estado.errores ?? {}
  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-4">
      <AvisoError texto={estado.error} />
      <CampoTexto
        etiqueta="Celular (WhatsApp)"
        name="telefono"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0414-1234567"
        defaultValue={estado.valores?.telefono}
        error={e.telefono}
        required
      />
      <CampoPin etiqueta="Tu PIN de 6 números" name="pin" error={e.pin} />
      <Enviar enviando={enviando} texto="Entrar" enviandoTexto="Entrando…" />
    </form>
  )
}

export function FormularioRegistro({ rol }: { rol: "pasajero" | "chofer" }) {
  const [estado, accion, enviando] = useActionState(registrarse, inicial)
  const formulario = useEnfocarError(estado.intento)
  const v = estado.valores ?? {}
  const e = estado.errores ?? {}
  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="rol" value={rol} />
      <AvisoError texto={estado.error} />

      <Grupo titulo="Tus datos">
        <CampoTexto etiqueta="Nombre y apellido" name="nombre" autoComplete="name" placeholder="Ej. María González" defaultValue={v.nombre} error={e.nombre} required />
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
        {rol === "pasajero" ? (
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
        ) : null}
      </Grupo>

      {rol === "chofer" ? (
        <Grupo titulo="Tu carro">
          <CampoTexto
            etiqueta="Placa"
            name="placa"
            autoCapitalize="characters"
            placeholder="AB123CD"
            defaultValue={v.placa}
            error={e.placa}
            className="font-mono tracking-widest uppercase"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto etiqueta="N° de unidad" name="unidad" inputMode="numeric" placeholder="07" defaultValue={v.unidad} error={e.unidad} />
            <CampoTexto etiqueta="Color" name="color" placeholder="Gris" defaultValue={v.color} error={e.color} />
          </div>
          <CampoTexto etiqueta="Modelo" name="modelo" placeholder="Chevrolet Aveo" defaultValue={v.modelo} error={e.modelo} />
          {/* R55: los pasajeros lo ven en cada unidad */}
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border p-4 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
            <span className="min-w-0 flex-1 font-medium">Mi carro tiene aire acondicionado</span>
            <input type="checkbox" role="switch" name="aire" value="si" defaultChecked={v.aire === "si"} className="peer sr-only" />
            <span
              aria-hidden
              className="relative h-7 w-12 shrink-0 rounded-full bg-muted-foreground/40 transition-colors peer-checked:bg-primary after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
            />
          </label>
        </Grupo>
      ) : null}

      {/* R74: opcional, con el porqué a la vista */}
      {rol === "chofer" ? (
        <Grupo titulo="Tu Pago Móvil (opcional)" detalle={POR_QUE_PAGO_MOVIL}>
          <CampoBanco defaultValue={v.pmBanco} error={e.pmBanco} />
          <CampoTexto etiqueta="Teléfono del Pago Móvil" name="pmTelefono" inputMode="tel" autoComplete="off" placeholder="0414-1234567" defaultValue={v.pmTelefono} error={e.pmTelefono} />
          <CampoTexto
            etiqueta="Cédula del Pago Móvil"
            name="pmCedula"
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="V-12345678"
            defaultValue={v.pmCedula}
            error={e.pmCedula}
          />
        </Grupo>
      ) : null}

      <Grupo titulo="Tu PIN para entrar">
        <CampoPin etiqueta="Crea un PIN de 6 números" name="pin" nuevo error={e.pin} ayuda="Guárdalo bien: lo usarás cada vez que entres." />
        <CampoPin etiqueta="Repite el PIN" name="pinConfirmado" nuevo error={e.pinConfirmado} />
      </Grupo>

      <Grupo titulo="Cédula (opcional)">
        <CampoTexto
          etiqueta="Tu cédula"
          name="cedula"
          inputMode="numeric"
          placeholder="V-12345678"
          defaultValue={v.cedula}
          error={e.cedula}
          ayuda="Ayuda a que el administrador te verifique más rápido. Solo la ve el administrador."
        />
      </Grupo>

      <Enviar enviando={enviando} texto="Crear mi cuenta" enviandoTexto="Creando tu cuenta…" />
    </form>
  )
}

/** R4: escoger el PIN propio después del temporal */
export function FormularioNuevoPin() {
  const [estado, accion, enviando] = useActionState(escogerMiPin, inicial)
  const formulario = useEnfocarError(estado.intento)
  const e = estado.errores ?? {}
  return (
    <form ref={formulario} key={estado.intento ?? 0} action={accion} noValidate className="flex flex-col gap-4">
      <AvisoError texto={estado.error} />
      <CampoPin etiqueta="Tu PIN nuevo (6 números)" name="pin" nuevo error={e.pin} ayuda="Uno fácil de recordar para ti, pero no tu fecha de nacimiento." />
      <CampoPin etiqueta="Repite el PIN" name="pinConfirmado" nuevo error={e.pinConfirmado} />
      <Enviar enviando={enviando} texto="Guardar mi PIN" enviandoTexto="Guardando…" />
    </form>
  )
}

/** Salir (funciona aunque el JavaScript aún no haya cargado) */
export function BotonSalir() {
  return (
    <form action={salir}>
      <Button type="submit" variant="ghost" size="lg" className="w-full text-muted-foreground">
        <LogOut /> Salir
      </Button>
    </form>
  )
}
