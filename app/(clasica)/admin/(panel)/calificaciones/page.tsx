import type { Metadata } from "next"

import { CalificacionesVista } from "@/components/admin/calificaciones"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Calificaciones · Administración · Línea Auxiliar" }

// Calificaciones de toda la línea (§8, Análisis)
export default async function PaginaCalificaciones({ searchParams }: PageProps<"/admin/calificaciones">) {
  await exigirAdmin()
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl leading-tight font-bold">Calificaciones</h1>
        <p className="text-muted-foreground">Lo que dicen los pasajeros de cada chofer, con quién lo dijo.</p>
      </header>
      <CalificacionesVista base="/admin/calificaciones" params={await searchParams} periodoPorDefecto="30" />
    </div>
  )
}
