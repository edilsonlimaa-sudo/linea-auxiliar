"use client"

import { Loader2Icon, RepeatIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Opcion } from "@/components/chofer/publicar-viaje"
import { useAccion } from "@/components/chofer/use-accion"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { publicarVuelta } from "@/lib/acciones/chofer"
import { contrario, haciaEnFrase, SENTIDOS, type Viaje } from "@/lib/viajes"

const MINUTOS = [20, 30, 45, 60]

/**
 * R61: justo después de "Salir" (todavía parado) y sin otro viaje publicado, "¿Haces la vuelta a …?". La vuelta es el
 * sentido contrario con los mismos puestos: solo se pregunta cuándo llega a recoger. Cerrar o "No" no hace nada.
 * Llega abierta por ?vuelta=1 (al salir el viaje cambia de lugar en la pantalla y un estado local se perdería).
 */
export function PreguntarVuelta({ viaje }: { viaje: Pick<Viaje, "sentido" | "puestos"> }) {
  const router = useRouter()
  const [abierta, setAbierta] = useState(true)
  const [minutos, setMinutos] = useState<number | null>(null)
  const { ejecutar, pendiente, error } = useAccion()
  const regreso = SENTIDOS[contrario(viaje.sentido)]

  const cerrar = () => {
    setAbierta(false)
    router.replace("/inicio", { scroll: false })
  }

  return (
    <Sheet open={abierta} onOpenChange={(v) => !v && cerrar()}>
      <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>¿Haces la vuelta {haciaEnFrase(contrario(viaje.sentido))}?</SheetTitle>
          <SheetDescription className="text-base">
            Con {viaje.puestos} {viaje.puestos === 1 ? "puesto" : "puestos"}. Los pasajeros la ven desde ya y pueden apartar.
          </SheetDescription>
        </SheetHeader>
        <fieldset className="flex flex-col gap-2 px-5">
          <legend className="mb-2 text-lg font-bold">¿Cuándo llegas a recoger {regreso.enRecogida}?</legend>
          <div className="grid grid-cols-2 gap-2">
            {MINUTOS.map((m) => (
              <Opcion key={m} nombre="vuelta-llega" elegida={minutos === m} onElegir={() => setMinutos(m)}>
                {m === 60 ? "1 hora" : `${m} min`}
              </Opcion>
            ))}
          </div>
        </fieldset>
        <SheetFooter>
          {error && (
            <p role="alert" className="font-bold text-destructive">
              {error}
            </p>
          )}
          <Button
            variant="signal"
            size="lg"
            className="w-full"
            disabled={minutos === null || pendiente}
            onClick={() => minutos !== null && ejecutar(() => publicarVuelta(viaje.sentido, viaje.puestos, minutos), cerrar)}
          >
            {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <RepeatIcon aria-hidden />}
            Sí, publicar la vuelta
          </Button>
          <Button variant="ghost" className="w-full" onClick={cerrar}>
            No, por ahora no
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
