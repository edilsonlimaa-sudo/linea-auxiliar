"use client"

import { BellRingIcon, HistoryIcon, Loader2Icon, MapPinIcon, RotateCcwIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { datosDelLugar, useGpsRecordado } from "@/components/pasajero/elegir-lugar"
import { FormularioEspera } from "@/components/pasajero/esperando"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { avisarQueEspero } from "@/lib/acciones/pasajero"
import { SENTIDOS, type Sentido } from "@/lib/viajes"

type Ultimo = { sentido: Sentido; lugar: string | null; conGps: boolean } | null

/**
 * La acción principal de Inicio (docs/especificacion.md §8): "Necesito un transporte". Recién aquí se pregunta
 * hacia dónde va y dónde está (en una hoja). Al lado, "Lo de siempre": repite su último pedido de un toque.
 */
export function NecesitoTransporte({
  recientes,
  sentidoSugerido,
  resumenes,
  ultimo,
  hayChoferes,
}: {
  recientes: string[]
  sentidoSugerido: Sentido
  resumenes: Record<Sentido, string>
  ultimo: Ultimo
  hayChoferes: boolean
}) {
  const [abierta, setAbierta] = useState(false)

  return (
    <section aria-labelledby="titulo-transporte" className="flex flex-col gap-3">
      <h2 id="titulo-transporte" className="sr-only">
        Pedir transporte
      </h2>
      <Button variant="signal" size="lg" className="h-18 w-full text-xl" onClick={() => setAbierta(true)}>
        <BellRingIcon aria-hidden className="size-7" />
        Necesito un transporte
      </Button>
      {!hayChoferes && (
        <p className="text-center text-[15px] text-muted-foreground">
          Aunque ahora no hay choferes, avisa: ven cuánta gente quiere ir y salen a buscarla.
        </p>
      )}
      {ultimo && <LoDeSiempre ultimo={ultimo} />}

      <Sheet open={abierta} onOpenChange={setAbierta}>
        <SheetContent side="bottom" className="mx-auto max-w-2xl">
          <SheetHeader>
            <SheetTitle>Necesito un transporte</SheetTitle>
            <SheetDescription className="text-base">Dinos hacia dónde vas y dónde te recogemos.</SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-6">
            <FormularioEspera
              key={String(abierta)}
              recientes={recientes}
              sentidoInicial={ultimo?.sentido ?? sentidoSugerido}
              resumenes={resumenes}
              onListo={() => setAbierta(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}

/** "Lo de siempre": su último pedido (sentido + lugar) en un toque. Si lo pidió con GPS, se vuelve a leer. */
function LoDeSiempre({ ultimo }: { ultimo: NonNullable<Ultimo> }) {
  const [gpsRecordado] = useGpsRecordado()
  const [enviando, iniciar] = useTransition()
  const [buscandoGps, setBuscandoGps] = useState(false)
  const [error, setError] = useState<string>()

  async function repetir() {
    setError(undefined)
    const conGps = ultimo.conGps || gpsRecordado
    setBuscandoGps(conGps)
    const r = await datosDelLugar(ultimo.lugar ?? "", conGps)
    setBuscandoGps(false)
    if ("error" in r) return setError(r.error)
    r.datos.set("sentido", ultimo.sentido)
    iniciar(async () => {
      const res = await avisarQueEspero(r.datos)
      setError(res.error)
    })
  }
  const ocupado = enviando || buscandoGps

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void repetir()}
        disabled={ocupado}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 border-primary/30 bg-card px-4 py-3 text-left hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
      >
        {ocupado ? <Loader2Icon aria-hidden className="size-6 shrink-0 animate-spin" /> : <RotateCcwIcon aria-hidden className="size-6 shrink-0 text-primary" />}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold tracking-wide text-muted-foreground uppercase">Lo de siempre</span>
          <span className="block font-bold">{SENTIDOS[ultimo.sentido].corto}</span>
          <span className="flex items-start gap-1 text-[15px] text-muted-foreground">
            <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="truncate">{ultimo.lugar ?? "Tu ubicación GPS"}</span>
          </span>
        </span>
        <span className="shrink-0 text-[15px] font-bold text-primary">{buscandoGps ? "Ubicando…" : enviando ? "Avisando…" : "Pedir"}</span>
      </button>
      {error && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/** Para quien entró a mirar y no a viajar */
export function Atajos() {
  const clase =
    "flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
  return (
    <nav aria-label="Atajos" className="grid grid-cols-2 gap-3">
      <Link href="/choferes" className={clase}>
        <UsersIcon aria-hidden className="size-6 shrink-0 text-primary" />
        Choferes
      </Link>
      <Link href="/mis-viajes" className={clase}>
        <HistoryIcon aria-hidden className="size-6 shrink-0 text-primary" />
        Mis viajes
      </Link>
    </nav>
  )
}
