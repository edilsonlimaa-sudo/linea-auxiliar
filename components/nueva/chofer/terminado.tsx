"use client"

import { PartyPopper } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/nueva/ui/drawer"

const COLORES = ["oklch(0.72 0.19 264)", "oklch(0.8 0.17 80)", "oklch(0.75 0.18 150)", "oklch(0.7 0.2 20)", "oklch(0.78 0.15 330)"]
// Piezas de confeti con posición y tiempo fijos por índice (sin azar: igual en el servidor y en el teléfono)
const PIEZAS = Array.from({ length: 26 }, (_, i) => ({
  x: `${(i * 37) % 100}%`,
  d: `${900 + ((i * 131) % 600)}ms`,
  r: `${(i * 53) % 350}ms`,
  g: `${((i * 97) % 2 ? 1 : -1) * (180 + ((i * 41) % 360))}deg`,
  c: COLORES[i % COLORES.length],
}))

export type Resumen = {
  sentido: string // "Al Centro"
  llevo: number
  puestos: number
  duracion: string // "18 min" o "—"
  viajesHoy: number
  personasHoy: number
}

/** El logro del día, en orden de prioridad (como en el prototipo) */
function marco(r: Resumen) {
  if (r.llevo >= r.puestos && r.puestos > 0) return { titulo: "¡Carro lleno!", detalle: "Fuiste con todos los puestos ocupados." }
  if (r.llevo === 0) return { titulo: "Esta vez fuiste solo", detalle: "El próximo se llena." }
  if (r.viajesHoy === 1) return { titulo: "Primer viaje del día", detalle: "Buen comienzo." }
  return { titulo: `Ya llevaste ${r.personasHoy === 1 ? "1 persona" : `${r.personasHoy} personas`} hoy`, detalle: `${r.viajesHoy} viajes desde la mañana.` }
}

/** Al terminar un viaje (?terminado=): confeti, el resumen y el logro del día. Se cierra con Listo */
export function ViajeTerminadoHoja({ resumen }: { resumen: Resumen }) {
  const router = useRouter()
  const [abierta, setAbierta] = React.useState(true)
  const m = marco(resumen)

  React.useEffect(() => {
    try {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate?.([60, 40, 60])
    } catch {
      // Sin vibración: nada que hacer
    }
  }, [])

  const cerrar = () => {
    setAbierta(false)
    router.replace("/n/chofer", { scroll: false })
  }

  return (
    <Drawer open={abierta} onOpenChange={(v) => !v && cerrar()} showSwipeHandle>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <div className="confeti" aria-hidden>
          {PIEZAS.map((p, i) => (
            <i key={i} style={{ "--x": p.x, "--d": p.d, "--r": p.r, "--g": p.g, "--c": p.c } as React.CSSProperties} />
          ))}
        </div>
        <DrawerHeader className="items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PartyPopper className="size-7" />
          </div>
          <DrawerTitle className="font-heading text-2xl">¡Viaje terminado!</DrawerTitle>
          <DrawerDescription>
            {resumen.sentido} · {m.titulo}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 px-4">
          <div className="grid grid-cols-3 gap-2">
            <Dato valor={String(resumen.llevo)} etiqueta={resumen.llevo === 1 ? "persona" : "personas"} />
            <Dato valor={resumen.duracion} etiqueta="de ruta" />
            <Dato valor={String(resumen.viajesHoy)} etiqueta={resumen.viajesHoy === 1 ? "viaje hoy" : "viajes hoy"} />
          </div>
          <p className="text-center text-sm text-muted-foreground">{m.detalle}</p>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <Button size="lg" onClick={cerrar}>
            Listo
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-muted/60 p-3 text-center">
      <span className="font-heading text-2xl leading-none font-semibold tabular-nums">{valor}</span>
      <span className="mt-1 text-xs text-muted-foreground">{etiqueta}</span>
    </div>
  )
}
