import "./tema.css"

import { Inter } from "next/font/google"

import { BarraSuperior } from "@/components/v2/barra-superior"
import { Navegacion } from "@/components/v2/navegacion"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-v2" })

/**
 * Casca del diseño nuevo del pasajero (v2, en construcción, en /v2): barra arriba, la pantalla y navegación abajo.
 * Todo lo de la v2 vive en components/v2 (su kit shadcn en components/v2/ui y su tema en tema.css, solo dentro de
 * .v2). La v2 se hace de cero: no usa nada de las pantallas de siempre, así que su tema cubre la casca entera.
 */
export function CascaV2({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("v2 min-h-svh bg-background text-foreground antialiased", inter.variable)}>
      {/* La fuente también para lo que se abre fuera de la casca (hojas, por portal) */}
      <style>{`:root { --font-v2: ${inter.style.fontFamily}; }`}</style>
      <BarraSuperior />
      {/* Abajo, lugar para la navegación fija (y el borde seguro del celular) */}
      <main className="mx-auto w-full max-w-lg px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <Navegacion />
    </div>
  )
}
