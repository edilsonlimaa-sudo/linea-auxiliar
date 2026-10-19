import type { Metadata } from "next"

import { ListaCuentas, estadoDeParam } from "@/components/admin/lista-cuentas"
import { NavAdmin } from "@/components/admin/nav-admin"
import { cargarCuentas, pendientesPorRol } from "@/lib/datos/admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Pasajeros · Administración · Línea Auxiliar" }

// Pasajeros del panel (§8)
export default async function PaginaPasajeros({ searchParams }: PageProps<"/admin/pasajeros">) {
  await exigirAdmin()
  const { estado } = await searchParams
  const { cuentas, error } = await cargarCuentas()

  return (
    <div className="flex flex-col gap-5">
      <NavAdmin activa="pasajeros" pendientes={pendientesPorRol(cuentas)} />
      <header className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-bold">Pasajeros</h1>
        <p className="text-muted-foreground">Revisa la foto y los datos antes de aprobar.</p>
      </header>
      <ListaCuentas rol="pasajero" estado={estadoDeParam(typeof estado === "string" ? estado : undefined)} cuentas={cuentas} error={error} />
    </div>
  )
}
