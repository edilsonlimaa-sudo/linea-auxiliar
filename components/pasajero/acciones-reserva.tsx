"use client"

import { CheckCircle2Icon, HandIcon, Loader2Icon, XIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { avisarQueLlegue, liberarPuesto } from "@/lib/acciones/pasajero"

/** "✋ Ya estoy en el sitio" (R23): la acción principal mientras el carro viene. Se puede deshacer. */
export function BotonYaLlegue({ reservaId, listo }: { reservaId: string; listo: boolean }) {
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string>()
  const cambiar = (valor: boolean) =>
    iniciar(async () => {
      const r = await avisarQueLlegue(reservaId, valor)
      setError(r.error)
    })

  if (listo) {
    return (
      <Alert variant="success">
        <CheckCircle2Icon aria-hidden />
        <AlertTitle>El chofer sabe que ya estás en el sitio</AlertTitle>
        <AlertDescription>
          <button type="button" onClick={() => cambiar(false)} disabled={pendiente} className="mt-1 font-bold underline underline-offset-4">
            Me equivoqué, todavía no estoy
          </button>
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <Button variant="signal" size="lg" className="w-full" disabled={pendiente} onClick={() => cambiar(true)}>
        {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <HandIcon aria-hidden />}
        Ya estoy en el sitio
      </Button>
      {error && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** "Ya no voy" (R20): pide confirmación porque el puesto pasa al siguiente y no se recupera */
export function BotonYaNoVoy({ reservaId, confirmado, chofer }: { reservaId: string; confirmado: boolean; chofer: string }) {
  const [abierto, setAbierto] = useState(false)
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string>()
  // Si sale bien, la acción lleva a Inicio; aquí solo queda mostrar un error
  const liberar = () =>
    iniciar(async () => {
      const r = await liberarPuesto(reservaId)
      setError(r?.error)
    })

  return (
    <>
      <Button
        variant="outline"
        className="w-full border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
        onClick={() => (setError(undefined), setAbierto(true))}
      >
        <XIcon aria-hidden />
        {confirmado ? "Ya no voy" : "Salir de la lista de espera"}
      </Button>
      <Confirmar
        abierto={abierto}
        onCambiar={setAbierto}
        titulo={confirmado ? "¿Ya no vas en este viaje?" : "¿Salir de la lista de espera?"}
        descripcion={
          confirmado
            ? `Tu puesto en el carro de ${chofer} pasa a la siguiente persona de la lista. Si cambias de idea, tendrás que apartar de nuevo.`
            : `Dejas tu turno en el carro de ${chofer}. Si cambias de idea, quedarás al final de la lista.`
        }
        confirmar={confirmado ? "Sí, ya no voy" : "Sí, salir de la lista"}
        cancelar={confirmado ? "No, sigo en el viaje" : "No, sigo esperando"}
        onConfirmar={liberar}
        ocupado={pendiente}
        error={error}
      />
    </>
  )
}
