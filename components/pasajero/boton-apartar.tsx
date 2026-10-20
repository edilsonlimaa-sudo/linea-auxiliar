"use client"

import { Loader2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { HojaLugar } from "@/components/pasajero/hoja-lugar"
import { Button } from "@/components/ui/button"
import { apartarPuesto } from "@/lib/acciones/pasajero"
import { cn } from "@/lib/utils"

/**
 * Apartar puesto (R27): sube la hoja "¿Dónde te recogemos?" y confirma. Si sale bien, la acción abre Mi viaje.
 * Al cambiarse de unidad (R22) no pregunta el lugar (usa el de su reserva) y pide confirmación, porque se cancela
 * la reserva anterior (R18).
 */
export function BotonApartar({
  viajeId,
  texto,
  variante = "default",
  reservaAnterior,
  recientes = [],
  lugarInicial,
  personas = 1,
  maxPersonas = 1,
  className,
}: {
  viajeId: string
  texto: string
  variante?: "default" | "outline"
  reservaAnterior?: string | null
  recientes?: string[]
  lugarInicial?: string | null // el de su espera, si estaba esperando
  personas?: number // cuántos van, si ya lo dijo (su espera); la hoja lo pregunta de nuevo (R57)
  maxPersonas?: number // hasta cuántos ofrece la hoja: los puestos libres (lista de espera: de a uno)
  className?: string
}) {
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string>()
  const [confirmar, setConfirmar] = useState(false)
  const [hoja, setHoja] = useState(false)

  const cambiarse = () =>
    iniciar(async () => {
      setError(undefined)
      const r = await apartarPuesto(viajeId)
      setError(r?.error)
    })

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* El texto puede ser largo ("Anotarme en la lista de espera"): baja de línea en vez de empujar el mapa fuera */}
      <Button variant={variante} className="h-auto min-h-13 w-full py-2 text-center whitespace-normal" disabled={pendiente} onClick={() => (reservaAnterior ? setConfirmar(true) : setHoja(true))}>
        {pendiente && <Loader2Icon aria-hidden className="animate-spin" />}
        {pendiente ? "Apartando…" : texto}
      </Button>
      {error && !confirmar && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}

      {reservaAnterior ? (
        <Confirmar
          abierto={confirmar}
          onCambiar={setConfirmar}
          titulo="¿Cambiarte a esta unidad?"
          descripcion={`Se cancela tu reserva en el carro de ${reservaAnterior} y apartas en este.`}
          confirmar="Sí, cambiarme"
          cancelar="No, me quedo donde estoy"
          variante="signal"
          ocupado={pendiente}
          error={error}
          onConfirmar={cambiarse}
        />
      ) : (
        <HojaLugar
          abierta={hoja}
          onCambiar={setHoja}
          titulo="¿Dónde te recogemos?"
          descripcion="El chofer lo ve en grande al llegar."
          recientes={recientes}
          lugarInicial={lugarInicial}
          textoBoton={(n) => (n > 1 && texto === "Apartar puesto" ? `Apartar ${n} puestos` : texto)}
          personas={{
            max: maxPersonas,
            inicial: personas,
            nota:
              maxPersonas === 1 && texto.includes("lista de espera")
                ? "La lista de espera es de a uno. Si van más, busquen una unidad con puestos o pidan que les avisemos."
                : maxPersonas < 4
                  ? `Este carro tiene ${maxPersonas === 1 ? "1 puesto libre" : `${maxPersonas} puestos libres`}.`
                  : undefined,
          }}
          onEnviar={(datos) => apartarPuesto(viajeId, datos)}
        />
      )}
    </div>
  )
}
