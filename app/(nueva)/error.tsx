"use client"

import { Loader2, RotateCw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/nueva/ui/button"
import { useRecargarSiEsDeVersion } from "@/lib/error-de-version"

// Interfaz nueva (pasajero y chofer): si una pantalla falla, esto en lugar de la pantalla cruda de Next. Un error de
// versión (la app quedó abierta durante un despliegue) se arregla recargando, y se recarga sola.
export default function ErrorNueva({ error, retry }: { error: unknown; retry: () => void }) {
  const recargando = useRecargarSiEsDeVersion(error)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      {recargando ? (
        <>
          <Loader2 aria-hidden className="size-8 animate-spin text-primary" />
          <p className="font-heading font-semibold">Actualizando la app…</p>
        </>
      ) : (
        <>
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <TriangleAlert aria-hidden className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-xl font-semibold">Algo salió mal</h1>
            <p className="text-sm text-muted-foreground">La pantalla no cargó bien. Recarga la app para seguir; no se pierde nada.</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button size="lg" onClick={() => window.location.reload()}>
              <RotateCw aria-hidden />
              Recargar la app
            </Button>
            <Button variant="outline" size="lg" onClick={() => retry()}>
              Volver a intentar
            </Button>
          </div>
        </>
      )}
    </main>
  )
}
