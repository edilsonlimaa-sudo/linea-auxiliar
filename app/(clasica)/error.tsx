"use client"

import { Loader2Icon, RotateCwIcon, TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useRecargarSiEsDeVersion } from "@/lib/error-de-version"

// Interfaz clásica: si una pantalla falla, esto en lugar de la pantalla cruda de Next. Un error de versión (la app quedó
// abierta durante un despliegue) se arregla recargando, y se recarga sola.
export default function ErrorClasica({ error, retry }: { error: unknown; retry: () => void }) {
  const recargando = useRecargarSiEsDeVersion(error)

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      {recargando ? (
        <>
          <Loader2Icon aria-hidden className="size-8 animate-spin text-primary" />
          <p className="font-bold">Actualizando la app…</p>
        </>
      ) : (
        <>
          <TriangleAlertIcon aria-hidden className="size-10 text-warning" />
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">Algo salió mal</h1>
            <p className="text-muted-foreground">La pantalla no cargó bien. Recarga la app para seguir; no se pierde nada.</p>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Button variant="signal" size="lg" onClick={() => window.location.reload()}>
              <RotateCwIcon aria-hidden />
              Recargar la app
            </Button>
            <Button variant="outline" onClick={() => retry()}>
              Volver a intentar
            </Button>
          </div>
        </>
      )}
    </main>
  )
}
