import "./tema.css"

import { Inter } from "next/font/google"

import { BarraSuperior } from "@/components/v2/barra-superior"
import { EnConstruccion } from "@/components/v2/en-construccion"
import { Navegacion } from "@/components/v2/navegacion"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-v2" })

/**
 * Casca del diseño nuevo del pasajero (v2, en construcción): barra arriba, contenido y navegación abajo. Todo lo de
 * la v2 vive en components/v2 (su kit shadcn en components/v2/ui y su tema en tema.css, solo dentro de .v2).
 * Nada del diseño de siempre se ve en la v2, así que su tema (clase .v2) cubre la casca entera: mientras una pantalla no tenga su versión nueva, se muestra "En
 * construcción" en su lugar (la pantalla vieja ni se arma). Cuando haya pantallas v2, `pantalla` las trae.
 */
export function CascaV2({ conViaje, pantalla }: { conViaje: boolean; pantalla?: React.ReactNode }) {
  return (
    <div className={cn("v2 min-h-svh bg-background text-foreground antialiased", inter.variable)}>
      <BarraSuperior />
      {/* Abajo, lugar para la navegación fija (y el borde seguro del celular) */}
      <main className="mx-auto w-full max-w-lg px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">{pantalla ?? <EnConstruccion />}</main>
      <Navegacion conViaje={conViaje} />
    </div>
  )
}
