import "./tema.css"

import { Inter } from "next/font/google"

import { BarraSuperior } from "@/components/v2/barra-superior"
import { Navegacion } from "@/components/v2/navegacion"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-v2" })

/**
 * Casca del diseño nuevo del pasajero (v2, en construcción): barra arriba, contenido y navegación abajo. Todo lo de
 * la v2 vive en components/v2 (su kit shadcn en components/v2/ui y su tema en tema.css, solo dentro de .v2).
 * Las pantallas que todavía no tienen versión v2 se ven aquí dentro tal cual.
 */
export function CascaV2({ children, conViaje }: { children: React.ReactNode; conViaje: boolean }) {
  return (
    <div className={cn("v2 min-h-svh antialiased", inter.variable)}>
      <BarraSuperior />
      {/* Abajo, lugar para la navegación fija (y el borde seguro del celular) */}
      <main className="mx-auto w-full max-w-lg px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      <Navegacion conViaje={conViaje} />
    </div>
  )
}
