"use client"

import { CalificarViaje } from "@/components/pasajero/calificar-viaje"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { ViajePasajero } from "@/lib/datos/historial"

/** Calificar un viaje pasado (R45) en una hoja: desde Mis viajes (R51) o desde Choferes (R46) */
export function HojaCalificar({
  viaje,
  onCerrar,
  volver = "mis-viajes",
}: {
  viaje: ViajePasajero | null
  onCerrar: () => void
  volver?: "mis-viajes" | "choferes"
}) {
  return (
    <Sheet open={viaje !== null} onOpenChange={(abierta) => !abierta && onCerrar()}>
      <SheetContent side="bottom" className="mx-auto max-w-2xl">
        <SheetHeader className="sr-only">
          <SheetTitle>Calificar el viaje</SheetTitle>
          <SheetDescription>Cuenta cómo te fue con el chofer.</SheetDescription>
        </SheetHeader>
        <div className="px-5 pt-6 pb-6">
          {viaje && (
            <CalificarViaje
              key={viaje.reservaId}
              desdeHistorial
              volver={volver}
              pendiente={{
                reservaId: viaje.reservaId,
                viajeId: viaje.viajeId,
                choferId: viaje.choferId,
                chofer: viaje.chofer,
                sentido: viaje.sentido,
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
