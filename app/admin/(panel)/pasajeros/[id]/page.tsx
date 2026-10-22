import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { VistaPasajero } from "@/components/admin/detalle-persona"
import { VolverALista } from "@/components/admin/lista-personas"
import { cargarDetallePasajero } from "@/lib/datos/personas-admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Pasajero · Administración · Línea Auxiliar" }

// Detalle de un pasajero en el panel (§8)
export default async function PaginaPasajero({ params }: PageProps<"/admin/pasajeros/[id]">) {
  await exigirAdmin()
  const { id } = await params
  const detalle = /^[0-9a-f-]{36}$/i.test(id) ? await cargarDetallePasajero(id) : null
  if (!detalle) notFound()

  return (
    <div className="flex flex-col gap-4">
      <VolverALista rol="pasajero" />
      <VistaPasajero detalle={detalle} />
    </div>
  )
}
