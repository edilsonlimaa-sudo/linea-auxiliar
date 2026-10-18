"use client"

import { BellRingIcon, CheckIcon, Loader2Icon, MapPinIcon, PencilIcon, XIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { CasillaGps, datosDelLugar, ElegirLugar, useGpsRecordado, useLugar } from "@/components/pasajero/elegir-lugar"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { avisarQueEspero, dejarDeEsperar } from "@/lib/acciones/pasajero"
import { hace } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { haciaEnFrase, SENTIDOS, type Sentido } from "@/lib/viajes"

/**
 * Paso 2 del Inicio del pasajero (docs/especificacion.md §8): ¿hacia dónde vas? y ¿dónde estás?, en la pantalla
 * y sin hojas. Avisar que espera es el primer paso de todos (R31); después aparta de un toque con este lugar (R27).
 * `resumenes`: una línea por sentido ("2 unidades van al Centro · …") para quien solo quiere saber si vale la pena.
 */
export function FormularioEspera({
  recientes,
  sentidoInicial,
  lugarInicial,
  resumenes,
  textoBoton = "Avisar que estoy esperando",
  onListo,
}: {
  recientes: string[]
  sentidoInicial: Sentido
  lugarInicial?: string | null
  resumenes: Record<Sentido, string>
  textoBoton?: string
  onListo?: () => void
}) {
  const [sentido, setSentido] = useState<Sentido>(sentidoInicial)
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
    r.datos.set("sentido", sentido)
    iniciar(async () => {
      const res = await avisarQueEspero(r.datos)
      setError(res.error)
      if (res.ok) onListo?.()
    })
  }
  const ocupado = enviando || buscandoGps

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void enviar()
      }}
      className="flex flex-col gap-6"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xl font-bold">¿Hacia dónde vas?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SENTIDOS) as Sentido[]).map((s) => {
            const activo = s === sentido
            return (
              <label
                key={s}
                className={cn(
                  "flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 px-3 text-lg font-bold has-focus-visible:ring-[3px] has-focus-visible:ring-ring",
                  activo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
                )}
              >
                <input type="radio" name="sentido-espera" checked={activo} onChange={() => setSentido(s)} className="sr-only" />
                {activo && <CheckIcon aria-hidden className="size-5" />}
                {SENTIDOS[s].corto}
              </label>
            )
          })}
        </div>
        <p aria-live="polite" className="text-[15px] text-muted-foreground">
          {resumenes[sentido]}
        </p>
      </fieldset>

      <ElegirLugar lugar={lugar} error={error} />
      <CasillaGps marcada={gps} onCambiar={setGps} />

      <Button type="submit" variant="signal" size="lg" disabled={ocupado} className="w-full">
        {ocupado ? <Loader2Icon aria-hidden className="animate-spin" /> : <BellRingIcon aria-hidden />}
        {buscandoGps ? "Buscando tu ubicación…" : enviando ? "Avisando…" : textoBoton}
      </Button>
    </form>
  )
}

/**
 * Paso 3: ya avisó que espera. Se ve hacia dónde y dónde, desde cuándo, y se puede cambiar o dejar de esperar.
 * La espera vence sola a las 2 h (R35).
 */
export function EstadoEspera({
  sentido,
  lugar,
  desde,
  recientes,
  resumenes,
}: {
  sentido: Sentido
  lugar: string | null
  desde: string
  recientes: string[]
  resumenes: Record<Sentido, string>
}) {
  const [pendiente, iniciar] = useTransition()
  const [cambiando, setCambiando] = useState(false)

  return (
    <section aria-labelledby="titulo-esperando" className="flex flex-col gap-3 rounded-3xl border-2 border-warning/40 bg-warning-muted p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="relative mt-2 flex size-3 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-3 rounded-full bg-warning" />
        </span>
        <div className="min-w-0">
          <h1 id="titulo-esperando" className="text-xl leading-tight font-bold">
            Estás esperando para ir {haciaEnFrase(sentido)}
          </h1>
          <p className="mt-1 flex items-start gap-1.5">
            <MapPinIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>{lugar ?? "Tu ubicación GPS"}</span>
          </p>
          <p className="text-[15px] text-muted-foreground">Desde {hace(desde)}. Los choferes ven que alguien espera.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setCambiando(true)}>
          <PencilIcon aria-hidden />
          Cambiar
        </Button>
        <Button variant="ghost" size="sm" disabled={pendiente} onClick={() => iniciar(async () => void (await dejarDeEsperar()))}>
          {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <XIcon aria-hidden />}
          Ya no estoy esperando
        </Button>
      </div>

      <Sheet open={cambiando} onOpenChange={setCambiando}>
        <SheetContent side="bottom" className="mx-auto max-w-2xl">
          <SheetHeader>
            <SheetTitle>Cambiar hacia dónde vas o dónde estás</SheetTitle>
            <SheetDescription className="text-base">Sigues esperando; solo se actualiza tu aviso.</SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-6">
            <FormularioEspera
              key={String(cambiando)}
              recientes={recientes}
              sentidoInicial={sentido}
              lugarInicial={lugar}
              resumenes={resumenes}
              textoBoton="Guardar cambios"
              onListo={() => setCambiando(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}
