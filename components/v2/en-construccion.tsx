"use client"

import { HammerIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/v2/ui/card"

const TITULOS: Record<string, string> = {
  "/inicio": "Inicio",
  "/mi-viaje": "Mi viaje",
  "/choferes": "Choferes",
  "/mis-viajes": "Mis viajes",
  "/carnet": "Perfil",
  "/linea": "La línea",
}

/** Lo que muestra la v2 en una pantalla que todavía no tiene su versión nueva: nada del diseño de siempre */
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
