"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

// El tema guardado solo se conoce en el navegador: en el servidor se pinta el ícono de "oscuro" (tema claro por defecto)
const suscribirse = () => () => {}

export function BotonTema() {
  const { resolvedTheme, setTheme } = useTheme()
  const montado = useSyncExternalStore(suscribirse, () => true, () => false)
  const oscuro = montado && resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(oscuro ? "light" : "dark")}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-header-foreground/35 bg-header-foreground/10 text-header-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      {oscuro ? <SunIcon className="size-5" aria-hidden /> : <MoonIcon className="size-5" aria-hidden />}
    </button>
  )
}
