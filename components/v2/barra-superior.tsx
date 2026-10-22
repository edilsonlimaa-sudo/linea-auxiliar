"use client"

import { LogOutIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { Button } from "@/components/v2/ui/button"
import { salir } from "@/lib/acciones/cuenta"

const suscribirse = () => () => {}

/** Arriba en la v2: la marca y, a la derecha, el modo oscuro y Salir (antes estaban en el menú lateral) */
export function BarraSuperior() {
  const { resolvedTheme, setTheme } = useTheme()
  const montado = useSyncExternalStore(suscribirse, () => true, () => false)
  const oscuro = montado && resolvedTheme === "dark"

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- ícono SVG local */}
          <img src="/icon.svg" alt="" width={28} height={28} className="size-7 rounded-md" />
          <span className="truncate font-semibold">Línea Auxiliar</span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          onClick={() => setTheme(oscuro ? "light" : "dark")}
        >
          {oscuro ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
        </Button>
        <form action={salir}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Salir">
            <LogOutIcon aria-hidden />
          </Button>
        </form>
      </div>
    </header>
  )
}
