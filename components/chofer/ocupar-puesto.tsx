"use client"

import { Loader2Icon, UserPlusIcon } from "lucide-react"
import { useId, useState } from "react"

import { Opcion } from "@/components/chofer/publicar-viaje"
import { useAccion } from "@/components/chofer/use-accion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ocuparPuesto } from "@/lib/acciones/chofer"
import { cn } from "@/lib/utils"
import { PERSONAS_MAX } from "@/lib/viajes"

/**
 * "➕ Ocupar puesto" para quien sube sin la app (R36–R37): primero dónde recogerlo y cuántos van (es lo que el chofer
 * necesita y lo que anotaba en el nombre); el nombre, opcional. Nada es obligatorio: un toque basta.
 */
export function OcuparPuesto({
  viajeId,
  enRuta,
  claro = false,
}: {
  viajeId: string
  enRuta: boolean
  claro?: boolean // sobre el azul del viaje en ruta (R75): botón blanco
}) {
  const idLugar = useId()
  const idNombre = useId()
  const [abierta, setAbierta] = useState(false)
  const [lugar, setLugar] = useState("")
  const [nombre, setNombre] = useState("")
  const [personas, setPersonas] = useState(1)
  const { ejecutar, pendiente, error, limpiar } = useAccion()

  const guardar = () =>
    ejecutar(
      () => ocuparPuesto(viajeId, { lugar, nombre, personas }),
      () => (setAbierta(false), setLugar(""), setNombre(""), setPersonas(1))
    )

  const quien = nombre.trim() || lugar.trim()
  return (
    <Sheet open={abierta} onOpenChange={(v) => (setAbierta(v), limpiar())}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            className={cn("h-auto min-h-11 w-full whitespace-normal", claro && "border-transparent bg-card text-primary hover:bg-card/90")}
          />
        }
      >
        <UserPlusIcon aria-hidden />
        {enRuta ? "Subió alguien" : "Ocupar puesto"}
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault()
            guardar()
          }}
        >
          <SheetHeader>
            <SheetTitle>{enRuta ? "Subió alguien en el camino" : "Ocupar un puesto"}</SheetTitle>
            <SheetDescription className="text-base">
              {enRuta
                ? "Para alguien que no usa la app y se montó en el camino."
                : "Para alguien que no usa la app. Toma el siguiente puesto libre."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idLugar} className="font-bold">
                {enRuta ? "¿Dónde se montó?" : "¿Dónde lo recoges?"}
              </label>
              <Input
                id={idLugar}
                value={lugar}
                onChange={(e) => setLugar(e.target.value)}
                maxLength={60}
                placeholder="Ej.: Entrada de Frailejones"
                autoComplete="off"
              />
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 font-bold">¿Cuántos van?</legend>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: PERSONAS_MAX }, (_, i) => i + 1).map((n) => (
                  <Opcion key={n} nombre="personas-a-mano" elegida={personas === n} onElegir={() => setPersonas(n)}>
                    {n}
                  </Opcion>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idNombre} className="font-bold">
                Nombre <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <Input id={idNombre} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Ej.: María" autoComplete="off" />
            </div>
            {error && (
              <p role="alert" className="font-bold text-destructive">
                {error}
              </p>
            )}
          </div>
          <SheetFooter className="p-4 pt-3">
            <Button type="submit" variant="signal" size="lg" className="w-full" disabled={pendiente}>
              {pendiente && <Loader2Icon aria-hidden className="animate-spin" />}
              {quien ? `Anotar · ${quien}${personas > 1 ? ` +${personas - 1}` : ""}` : personas > 1 ? `Anotar ${personas} personas` : "Anotar"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
