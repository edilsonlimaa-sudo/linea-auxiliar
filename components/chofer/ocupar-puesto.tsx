"use client"

import { Loader2Icon, UserPlusIcon } from "lucide-react"
import { useId, useState } from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ocuparPuesto } from "@/lib/acciones/chofer"

/** "➕ Ocupar puesto" para quien sube sin la app (R36–R37). El nombre es opcional: un toque basta. */
export function OcuparPuesto({ viajeId, enRuta }: { viajeId: string; enRuta: boolean }) {
  const id = useId()
  const [abierta, setAbierta] = useState(false)
  const [nombre, setNombre] = useState("")
  const { ejecutar, pendiente, error, limpiar } = useAccion()

  const guardar = () =>
    ejecutar(
      () => ocuparPuesto(viajeId, nombre),
      () => (setAbierta(false), setNombre(""))
    )

  return (
    <Sheet open={abierta} onOpenChange={(v) => (setAbierta(v), limpiar())}>
      <SheetTrigger render={<Button variant="outline" className="h-auto min-h-11 w-full whitespace-normal" />}>
        <UserPlusIcon aria-hidden />
        {enRuta ? "Subió alguien" : "Ocupar puesto"}
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-2xl">
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
          <div className="flex flex-col gap-1.5 px-4 pb-2">
            <label htmlFor={id} className="font-bold">
              Nombre <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <Input id={id} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={40} placeholder="Ej.: Señora del 4-B" autoComplete="off" />
            {error && (
              <p role="alert" className="font-bold text-destructive">
                {error}
              </p>
            )}
          </div>
          <SheetFooter className="p-4 pt-3">
            <Button type="submit" variant="signal" size="lg" className="w-full" disabled={pendiente}>
              {pendiente && <Loader2Icon aria-hidden className="animate-spin" />}
              {nombre.trim() ? `Anotar a ${nombre.trim()}` : "Anotar sin nombre"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
