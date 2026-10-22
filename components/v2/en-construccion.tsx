"use client"

import { HammerIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/v2/ui/card"

const TITULOS: Record<string, string> = {
  "/v2": "Inicio",
  "/v2/choferes": "Choferes",
  "/v2/mis-viajes": "Mis viajes",
  "/v2/perfil": "Perfil",
}

/** Lo que muestra una pantalla de la v2 que todavía no se hizo */
export function EnConstruccion() {
  const ruta = usePathname()
  const titulo = TITULOS[ruta] ?? "Esta pantalla"
  return (
    <Card>
      <CardHeader>
        <HammerIcon aria-hidden className="mb-2 size-6 text-muted-foreground" />
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>En construcción: esta pantalla todavía no tiene su versión nueva.</CardDescription>
      </CardHeader>
    </Card>
  )
}
