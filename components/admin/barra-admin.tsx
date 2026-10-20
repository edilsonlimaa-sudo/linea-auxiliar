"use client"

import { MenuIcon } from "lucide-react"

import { useSidebar } from "@/components/ui/sidebar"

// Barra del panel en el celular: botón "Menú" con texto (como la app) y la marca. En la computadora el menú está fijo.
export function BarraAdmin() {
  const { toggleSidebar, openMobile } = useSidebar()
  return (
    <header className="sticky top-0 z-20 border-b-4 border-signal bg-header text-header-foreground md:hidden">
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={openMobile}
          className="flex h-12 shrink-0 items-center gap-2 rounded-xl border-2 border-header-foreground/35 bg-header-foreground/10 px-3 text-base font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <MenuIcon aria-hidden className="size-6" />
          Menú
        </button>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[17px] font-bold">Línea Auxiliar</span>
          <span className="block truncate text-sm opacity-90">Administración</span>
        </span>
      </div>
    </header>
  )
}
