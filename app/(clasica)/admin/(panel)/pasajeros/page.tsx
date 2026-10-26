import type { Metadata } from "next"

import { EnLaNuevaFranja } from "@/components/admin/en-la-nueva"
import { ListaPersonas } from "@/components/admin/lista-personas"
import { cargarEnLaNueva } from "@/lib/datos/interfaz"
import { cargarPersonas } from "@/lib/datos/personas-admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Pasajeros · Administración · Línea Auxiliar" }

// Pasajeros del panel (§8): los aprobados, con búsqueda en pantalla; cada uno abre su detalle. Aprobar va en Por aprobar
export default async function PaginaPasajeros({ searchParams }: PageProps<"/admin/pasajeros">) {
  await exigirAdmin()
  const { q } = await searchParams
  const busqueda = typeof q === "string" ? q.trim().slice(0, 60) : ""
  const [{ personas, error }, enLaNueva] = await Promise.all([cargarPersonas("pasajero"), cargarEnLaNueva("pasajero")])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl leading-tight font-bold">Pasajeros</h1>
      {/* R83: quiénes ya usan la interfaz nueva */}
      <EnLaNuevaFranja personas={enLaNueva} base="/admin/pasajeros" />
      <ListaPersonas rol="pasajero" todas={personas} busquedaInicial={busqueda} error={error} />
    </div>
  )
}
