import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CuentaPrueba } from "@/components/admin/cuenta-prueba"
import { VistaChofer } from "@/components/admin/detalle-persona"
import { InterfazCuenta } from "@/components/admin/interfaz-cuenta"
import { RestablecerPin } from "@/components/admin/restablecer-pin"
import { VolverALista } from "@/components/admin/lista-personas"
import { esDePrueba } from "@/lib/datos/demanda"
import { interfazDe } from "@/lib/datos/interfaz"
import { cargarDetalleChofer } from "@/lib/datos/personas-admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Chofer · Administración · Línea Auxiliar" }

// Detalle de un chofer en el panel (§8)
export default async function PaginaChofer({ params }: PageProps<"/admin/choferes/[id]">) {
  await exigirAdmin()
  const { id } = await params
  const [detalle, prueba, interfaz] = /^[0-9a-f-]{36}$/i.test(id)
    ? await Promise.all([cargarDetalleChofer(id), esDePrueba(id), interfazDe(id)])
    : [null, false, "clasica" as const]
  if (!detalle) notFound()

  return (
    <div className="flex flex-col gap-4">
      <VolverALista rol="chofer" />
      {/* R83: en qué interfaz está, y el botón para cambiarla */}
      <InterfazCuenta id={id} nombre={detalle.cuenta.nombre} interfaz={interfaz} />
      <VistaChofer detalle={detalle} />
      {/* R86: si es de prueba, no cuenta en Demanda y oferta */}
      <CuentaPrueba id={id} prueba={prueba} />
      {/* R4: PIN olvidado */}
      <RestablecerPin id={id} nombre={detalle.cuenta.nombre} telefono={detalle.cuenta.telefono} />
    </div>
  )
}
