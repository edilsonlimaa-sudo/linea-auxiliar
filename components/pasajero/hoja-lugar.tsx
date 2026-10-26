"use client"

import { CheckIcon, Loader2Icon } from "lucide-react"
import { useState, useTransition } from "react"

import { datosDelLugar, ElegirLugar, useLugar } from "@/components/pasajero/elegir-lugar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { tarifaEn, textoTarifa } from "@/lib/tarifas"
import { cn } from "@/lib/utils"

/** "¿Cuántos van?" en la hoja (R57): hasta `max` (los puestos libres de ese carro, máx. 4); `nota` explica el límite */
export type OpcionPersonas = { max: number; inicial?: number; nota?: string }

/**
 * "¿Dónde te recogemos?" (R25–R27): se pregunta recién al apartar o al pedir "Avísame cuando haya una".
 * Con `personas`, empieza por "¿Cuántos van?" (R57). Dónde está: solo texto (R26). El texto del botón puede depender de cuántos van ("Apartar 3 puestos").
 */
export function HojaLugar({
  abierta,
  onCambiar,
  titulo,
  descripcion,
  lugarInicial,
  textoBoton,
  personas,
  enviando: enviandoFuera = false,
  onEnviar,
}: {
  abierta: boolean
  onCambiar: (abierta: boolean) => void
  titulo: string
  descripcion: string
  lugarInicial?: string | null
  textoBoton: string | ((personas: number) => string)
  personas?: OpcionPersonas
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
        {/* Se monta al abrir: cada vez empieza limpio (o con el lugar inicial) */}
        {abierta && <Formulario lugarInicial={lugarInicial} textoBoton={textoBoton} personas={personas} onEnviar={onEnviar} />}
      </SheetContent>
    </Sheet>
  )
}

function Formulario({
  lugarInicial,
  textoBoton,
  personas,
  onEnviar,
}: {
  lugarInicial?: string | null
  textoBoton: string | ((personas: number) => string)
  personas?: OpcionPersonas
  onEnviar: (datos: FormData) => Promise<{ error?: string } | undefined>
}) {
  const max = Math.max(1, Math.min(4, personas?.max ?? 1))
  const [cuantos, setCuantos] = useState(Math.min(personas?.inicial ?? 1, max))
  const lugar = useLugar(lugarInicial)
  // R80: al apartar, una línea solo si rige la tarifa especial (se calcula al abrir la hoja)
  const [tarifa] = useState(() => tarifaEn(new Date()))
  const [error, setError] = useState<string>()
  const [enviando, iniciar] = useTransition()

  function enviar() {
    setError(undefined)
    const r = datosDelLugar(lugar.valor)
    if ("error" in r) return setError(r.error)
    if (personas) r.datos.set("personas", String(cuantos))
    iniciar(async () => {
      const res = await onEnviar(r.datos)
      if (res?.error) setError(res.error)
    })
  }
  const ocupado = enviando

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        enviar()
      }}
      className="flex flex-col gap-4 px-4 pb-6"
    >
      {personas && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">¿Cuántos van?</legend>
          {max > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
                const activo = n === cuantos
                return (
                  <label
                    key={n}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-2xl border-2 px-2 text-center font-bold has-focus-visible:ring-[3px] has-focus-visible:ring-ring",
                      activo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
                    )}
                  >
                    <input type="radio" name="cuantos-van" checked={activo} onChange={() => setCuantos(n)} className="sr-only" />
                    {activo && <CheckIcon aria-hidden className="size-4" />}
                    {n === 1 ? "Solo yo" : n}
                  </label>
                )
              })}
            </div>
          )}
          {personas.nota && <p className="text-sm text-muted-foreground">{personas.nota}</p>}
        </fieldset>
      )}
      <ElegirLugar lugar={lugar} error={error} />
      {personas && tarifa.tipo !== "normal" && (
        <p className="rounded-xl bg-signal/15 px-3 py-2 text-sm">
          Pasaje: <strong>{textoTarifa(tarifa)}</strong>
        </p>
      )}
      <Button type="submit" variant="signal" size="lg" disabled={ocupado} className="w-full">
        {ocupado && <Loader2Icon aria-hidden className="animate-spin" />}
        {enviando ? "Un momento…" : typeof textoBoton === "function" ? textoBoton(cuantos) : textoBoton}
      </Button>
    </form>
  )
}
