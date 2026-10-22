import type { Metadata } from "next"

import { ListaPersonas } from "@/components/admin/lista-personas"
import { cargarPersonas } from "@/lib/datos/personas-admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Pasajeros · Administración · Línea Auxiliar" }

// Pasajeros del panel (§8): los aprobados, con búsqueda; cada uno abre su detalle. Aprobar va en Por aprobar
export default async function PaginaPasajeros({ searchParams }: PageProps<"/admin/pasajeros">) {
  await exigirAdmin()
  const { q } = await searchParams
  const busqueda = typeof q === "string" ? q.trim().slice(0, 60) : ""
  const { personas, total, error } = await cargarPersonas("pasajero", busqueda)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl leading-tight font-bold">Pasajeros</h1>
      <ListaPersonas rol="pasajero" personas={personas} total={total} busqueda={busqueda} error={error} />
    </div>
  )
}
