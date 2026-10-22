import type { Metadata } from "next"

import { ViajesCerrados } from "@/components/admin/viajes-cerrados"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Viajes terminados · Administración · Línea Auxiliar" }

// Viajes cerrados de toda la línea (§8)
export default async function PaginaTerminados({ searchParams }: PageProps<"/admin/viajes/terminados">) {
  await exigirAdmin()
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl leading-tight font-bold">Viajes terminados</h1>
      <ViajesCerrados base="/admin/viajes/terminados" params={await searchParams} />
    </div>
  )
}
