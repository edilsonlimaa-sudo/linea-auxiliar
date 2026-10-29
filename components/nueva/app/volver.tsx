"use client"

import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import { Button } from "@/components/nueva/ui/button"

// Cuántas pantallas hay detrás de esta dentro de la app (en esta carga): ir a otra suma una, volver (Android o la flecha)
// resta una. Si la app se abrió directo en esta pantalla (un aviso, un enlace), es 0: no hay a dónde volver dentro.
let detras = 0
let volviendo = false
let rutaVista: string | null = null // la última pantalla contada (así el efecto doble de React no cuenta dos veces)

/** Lleva la cuenta de la navegación. Va una vez, en AppShell */
export function SeguirNavegacion() {
  const ruta = usePathname()

  React.useEffect(() => {
    const alVolver = () => {
      volviendo = true
    }
    window.addEventListener("popstate", alVolver)
    return () => window.removeEventListener("popstate", alVolver)
  }, [])

  React.useEffect(() => {
    if (rutaVista === ruta) return
    if (rutaVista !== null) detras = volviendo ? Math.max(0, detras - 1) : detras + 1
    rutaVista = ruta
    volviendo = false
  }, [ruta])

  return null
}

/**
 * La flecha del encabezado hace lo mismo que el botón atrás de Android: vuelve en el historial (la pantalla anterior,
 * al instante y como estaba, sin pedirla otra vez al servidor). Si no hay pantalla anterior de la app, va a `href`
 * reemplazando la actual, para no apilar el historial.
 */
export function BotonVolver({ href }: { href: string }) {
  const router = useRouter()
  return (
    <Button
      render={<Link href={href} replace transitionTypes={["nav-back"]} />}
      nativeButton={false}
      variant="ghost"
      size="icon"
      aria-label="Voltar"
      onClick={(e: React.MouseEvent) => {
        if (detras === 0) return
        e.preventDefault()
        router.back()
      }}
    >
      <ChevronLeft className="size-5" />
    </Button>
  )
}
