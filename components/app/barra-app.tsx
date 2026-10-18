"use client"

import { MenuIcon } from "lucide-react"

import { useSidebar } from "@/components/ui/sidebar"

// Barra superior de la app: botón "Menú" con texto (el ícono ☰ solo no lo reconoce todo el mundo) y la marca
export function BarraApp() {
  const { toggleSidebar, openMobile, isMobile, open } = useSidebar()
  const abierto = isMobile ? openMobile : open

  return (
    <header className="sticky top-0 z-20 border-b-4 border-signal bg-header text-header-foreground">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={abierto}
          className="flex h-12 shrink-0 items-center gap-2 rounded-xl border-2 border-header-foreground/35 bg-header-foreground/10 px-3 text-base font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <MenuIcon aria-hidden className="size-6" />
          Menú
        </button>
        <div className="flex min-w-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- ícono SVG local */}
          <img src="/icon.svg" alt="" width={34} height={34} className="size-8.5 rounded-[9px]" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[17px] font-bold">Línea Auxiliar</span>
            <span className="block truncate text-sm opacity-90">Valle Grande</span>
          </span>
        </div>
      </div>
    </header>
  )
}
