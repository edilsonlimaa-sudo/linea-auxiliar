"use client"

import { ClockAlertIcon, Loader2Icon } from "lucide-react"
import { useCallback, useState, useSyncExternalStore } from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { meAtraso } from "@/lib/acciones/chofer"
import { hora } from "@/lib/fechas"

const MIN = 60_000
const OPCIONES = [5, 10, 15, 20, 30, 45, 60] as const
const texto = (m: number) => (m === 60 ? "1 hora" : `${m} min`)

/**
 * "Me atraso" (R70): mientras va a recoger, el chofer da una hora nueva con un toque. Si ya pasó la hora que dijo,
 * se avisa en amarillo con el botón a mano (sus pasajeros ven "en cualquier momento"); antes, el botón es discreto.
 */
export function MeAtraso({ viajeId, estadoEn, etaMin }: { viajeId: string; estadoEn: string; etaMin: number }) {
  const [abierta, setAbierta] = useState(false)
  const { ejecutar, pendiente, error } = useAccion()
  const [escogido, setEscogido] = useState<number>()

  // Reloj: en el servidor no hay hora (0), así no cambia al hidratar
  const suscribir = useCallback((avisar: () => void) => {
    const id = setInterval(avisar, 15_000)
    return () => clearInterval(id)
  }, [])
  const ahora = useSyncExternalStore(suscribir, () => Math.floor(Date.now() / 15_000) * 15_000, () => 0)
  const prometida = new Date(estadoEn).getTime() + etaMin * MIN
  const vencido = ahora > 0 && ahora >= prometida

  const boton = (
    <Button variant={vencido ? "default" : "outline"} className="w-full" onClick={() => setAbierta(true)}>
      <ClockAlertIcon aria-hidden />
      {vencido ? "Dar una hora nueva" : "Me atraso"}
    </Button>
  )

  return (
    <>
      {vencido ? (
        <div role="status" className="flex flex-col gap-3 rounded-2xl border-2 border-warning bg-warning-muted p-3">
          <p className="flex items-start gap-2">
            <ClockAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
            <span>
              <strong>Ya pasó la hora que dijiste ({hora(new Date(prometida).toISOString())}).</strong> Tus pasajeros ven «en
              cualquier momento»: dales una hora nueva.
            </span>
          </p>
          {boton}
        </div>
      ) : (
        boton
      )}

      <Sheet open={abierta} onOpenChange={(v) => !pendiente && setAbierta(v)}>
        <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>¿En cuánto llegas a recoger?</SheetTitle>
            <SheetDescription className="text-base">Tus pasajeros ven la hora nueva y que avisaste que te atrasas.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-5 pb-6">
            <div className="grid grid-cols-2 gap-2">
              {OPCIONES.map((m) => (
                <Button
                  key={m}
                  variant="outline"
                  size="lg"
                  className="h-auto min-h-16 flex-col gap-0 py-2"
                  disabled={pendiente}
                  onClick={() => {
                    setEscogido(m)
                    ejecutar(() => meAtraso(viajeId, m), () => setAbierta(false))
                  }}
                >
                  <span className="flex items-center gap-1.5 text-lg font-bold">
                    {pendiente && escogido === m && <Loader2Icon aria-hidden className="animate-spin" />}
                    {texto(m)}
                  </span>
                  {ahora > 0 && (
                    <span className="text-[15px] font-normal text-muted-foreground">a las {hora(new Date(ahora + m * MIN).toISOString())}</span>
                  )}
                </Button>
              ))}
            </div>
            {error && (
              <p role="alert" className="font-bold text-destructive">
                {error}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
