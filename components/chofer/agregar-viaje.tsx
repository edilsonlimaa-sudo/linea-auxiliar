"use client"

import { PlusIcon, SendIcon } from "lucide-react"
import { useState } from "react"

import { PublicarViaje, type ModoPublicar } from "@/components/chofer/publicar-viaje"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { Sentido } from "@/lib/viajes"

/**
 * Publicar un viaje en una hoja: el primero del día desde Inicio (la acción principal, §8) o "➕ Agregar otro viaje"
 * mientras tiene viajes abiertos (R11).
 */
export function AgregarViaje({
  modo,
  ultimo,
  sentidoInicial,
}: {
  modo: ModoPublicar
  ultimo: { sentido: Sentido; puestos: number } | null
  sentidoInicial?: Sentido | null
}) {
  const [abierta, setAbierta] = useState(false)
  const primero = modo === "primero"
  return (
    <Sheet open={abierta} onOpenChange={setAbierta}>
      {primero ? (
        <SheetTrigger render={<Button variant="signal" size="lg" className="h-18 w-full text-xl" />}>
          <SendIcon aria-hidden className="size-7" />
          Publicar un viaje
        </SheetTrigger>
      ) : (
        <SheetTrigger render={<Button variant="outline" size="lg" className="w-full border-dashed" />}>
          <PlusIcon aria-hidden />
          Agregar otro viaje
        </SheetTrigger>
      )}
      <SheetContent side="bottom" className="mx-auto max-w-2xl">
        <SheetHeader>
          <SheetTitle>{primero ? "Publicar un viaje" : "Agregar otro viaje"}</SheetTitle>
          <SheetDescription className="text-base">
            {primero
              ? "Los pasajeros te ven trabajando y pueden apartar desde ya. Publicar te conecta."
              : modo === "cadena"
                ? "Queda como tu próximo viaje y los pasajeros ya pueden apartar."
                : "Empieza ya: los pasajeros te ven en camino a recogerlos."}
          </SheetDescription>
        </SheetHeader>
        {/* key: al reabrir la hoja el formulario empieza limpio */}
        <div className="px-5">
          <PublicarViaje
            key={String(abierta)}
            modo={modo}
            ultimo={ultimo}
            sentidoInicial={sentidoInicial}
            enHoja
            onPublicado={() => setAbierta(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
