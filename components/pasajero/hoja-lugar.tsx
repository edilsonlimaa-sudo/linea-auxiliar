"use client"

import { Loader2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { CasillaGps, datosDelLugar, ElegirLugar, useGpsRecordado, useLugar } from "@/components/pasajero/elegir-lugar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

/**
 * "¿Dónde te recogemos?" (R25–R27): se pregunta recién al apartar o al pedir "Avísame cuando haya una".
 * Lugares recientes de un toque (el último ya escogido), otro escrito y GPS opcional.
 */
export function HojaLugar({
  abierta,
  onCambiar,
  titulo,
  descripcion,
  recientes,
  lugarInicial,
  textoBoton,
  enviando: enviandoFuera = false,
  onEnviar,
}: {
  abierta: boolean
  onCambiar: (abierta: boolean) => void
  titulo: string
  descripcion: string
  recientes: string[]
  lugarInicial?: string | null
  textoBoton: string
  enviando?: boolean
  onEnviar: (datos: FormData) => Promise<{ error?: string } | undefined>
}) {
  return (
    <Sheet open={abierta} onOpenChange={(v) => !enviandoFuera && onCambiar(v)}>
      <SheetContent side="bottom" className="mx-auto max-h-[92svh] max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{titulo}</SheetTitle>
          <SheetDescription className="text-base">{descripcion}</SheetDescription>
        </SheetHeader>
        {/* key: al abrir de nuevo empieza con el lugar más reciente */}
        {abierta && <Formulario recientes={recientes} lugarInicial={lugarInicial} textoBoton={textoBoton} onEnviar={onEnviar} />}
      </SheetContent>
    </Sheet>
  )
}

function Formulario({
  recientes,
  lugarInicial,
  textoBoton,
  onEnviar,
}: {
  recientes: string[]
  lugarInicial?: string | null
  textoBoton: string
  onEnviar: (datos: FormData) => Promise<{ error?: string } | undefined>
}) {
  const lugar = useLugar(recientes, lugarInicial)
  const [gps, setGps] = useGpsRecordado()
  const [error, setError] = useState<string>()
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [enviando, iniciar] = useTransition()

  async function enviar() {
    setError(undefined)
    setBuscandoGps(gps)
    const r = await datosDelLugar(lugar.valor, gps)
    setBuscandoGps(false)
    if ("error" in r) return setError(r.error)
    iniciar(async () => {
      const res = await onEnviar(r.datos)
      if (res?.error) setError(res.error)
    })
  }
  const ocupado = enviando || buscandoGps

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void enviar()
      }}
      className="flex flex-col gap-5 px-5 pb-6"
    >
      <ElegirLugar lugar={lugar} error={error} />
      <CasillaGps marcada={gps} onCambiar={setGps} />
      <Button type="submit" variant="signal" size="lg" disabled={ocupado} className="w-full">
        {ocupado && <Loader2Icon aria-hidden className="animate-spin" />}
        {buscandoGps ? "Buscando tu ubicación…" : enviando ? "Un momento…" : textoBoton}
      </Button>
    </form>
  )
}
