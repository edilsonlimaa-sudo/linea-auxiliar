import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CuentaPrueba } from "@/components/admin/cuenta-prueba"
import { VistaPasajero } from "@/components/admin/detalle-persona"
import { InterfazCuenta } from "@/components/admin/interfaz-cuenta"
import { RestablecerPin } from "@/components/admin/restablecer-pin"
import { VolverALista } from "@/components/admin/lista-personas"
import { esDePrueba } from "@/lib/datos/demanda"
import { interfazDe } from "@/lib/datos/interfaz"
import { cargarDetallePasajero } from "@/lib/datos/personas-admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Pasajero · Administración · Línea Auxiliar" }

// Detalle de un pasajero en el panel (§8)
export default async function PaginaPasajero({ params }: PageProps<"/admin/pasajeros/[id]">) {
  await exigirAdmin()
  const { id } = await params
  const valido = /^[0-9a-f-]{36}$/i.test(id)
  const [detalle, interfaz, prueba] = valido
    ? await Promise.all([cargarDetallePasajero(id), interfazDe(id), esDePrueba(id)])
    : [null, "clasica" as const, false]
  if (!detalle) notFound()

  return (
    <div className="flex flex-col gap-4">
      <VolverALista rol="pasajero" />
      {/* R83: en qué interfaz está, y el botón para cambiarla */}
      <InterfazCuenta id={id} nombre={detalle.cuenta.nombre} interfaz={interfaz} />
      <VistaPasajero detalle={detalle} />
      {/* R86: si es de prueba, no cuenta en Demanda y oferta */}
      <CuentaPrueba id={id} prueba={prueba} />
      {/* R4: PIN olvidado */}
      <RestablecerPin id={id} nombre={detalle.cuenta.nombre} telefono={detalle.cuenta.telefono} />
    </div>
  )
}
