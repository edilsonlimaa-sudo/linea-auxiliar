import type { Metadata } from "next"

import { ListaPersonas } from "@/components/admin/lista-personas"
import { cargarPersonas } from "@/lib/datos/personas-admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Choferes · Administración · Línea Auxiliar" }

// Choferes del panel (§8): los aprobados, con búsqueda en pantalla; cada uno abre su detalle. Aprobar va en Por aprobar
export default async function PaginaChoferes({ searchParams }: PageProps<"/admin/choferes">) {
  await exigirAdmin()
  const { q } = await searchParams
  const busqueda = typeof q === "string" ? q.trim().slice(0, 60) : ""
  const { personas, error } = await cargarPersonas("chofer")

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl leading-tight font-bold">Choferes</h1>
      <ListaPersonas rol="chofer" todas={personas} busquedaInicial={busqueda} error={error} />
    </div>
  )
}
