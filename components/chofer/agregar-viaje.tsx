"use client"

import { PlusIcon } from "lucide-react"
import { useState } from "react"

import { PublicarViaje, type ModoPublicar } from "@/components/chofer/publicar-viaje"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { Sentido } from "@/lib/viajes"

/** "➕ Agregar otro viaje" (R11): el mismo formulario de publicar, en una hoja, mientras tiene viajes abiertos */
export function AgregarViaje({
  modo,
  esperando,
  ultimo,
}: {
  modo: Exclude<ModoPublicar, "primero">
  esperando: Record<Sentido, number>
  ultimo: { sentido: Sentido; puestos: number } | null
}) {
  const [abierta, setAbierta] = useState(false)
  return (
    <Sheet open={abierta} onOpenChange={setAbierta}>
      <SheetTrigger render={<Button variant="outline" size="lg" className="w-full border-dashed" />}>
        <PlusIcon aria-hidden />
        Agregar otro viaje
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-2xl">
        <SheetHeader>
          <SheetTitle>Agregar otro viaje</SheetTitle>
          <SheetDescription className="text-base">
            {modo === "cadena"
              ? "Queda como tu próximo viaje y los pasajeros ya pueden apartar."
              : "Empieza ya: los pasajeros te ven en camino a recogerlos."}
          </SheetDescription>
        </SheetHeader>
        {/* key: al reabrir la hoja el formulario empieza limpio */}
        <div className="px-5">
          <PublicarViaje key={String(abierta)} modo={modo} esperando={esperando} ultimo={ultimo} enHoja onPublicado={() => setAbierta(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
