import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { VistaChofer } from "@/components/admin/detalle-persona"
import { VolverALista } from "@/components/admin/lista-personas"
import { cargarDetalleChofer } from "@/lib/datos/personas-admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Chofer · Administración · Línea Auxiliar" }

// Detalle de un chofer en el panel (§8)
export default async function PaginaChofer({ params }: PageProps<"/admin/choferes/[id]">) {
  await exigirAdmin()
  const { id } = await params
  const detalle = /^[0-9a-f-]{36}$/i.test(id) ? await cargarDetalleChofer(id) : null
  if (!detalle) notFound()

  return (
    <div className="flex flex-col gap-4">
      <VolverALista rol="chofer" />
      <VistaChofer detalle={detalle} />
    </div>
  )
}
