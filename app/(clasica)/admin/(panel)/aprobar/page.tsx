import type { Metadata } from "next"

import { AvisosAdmin } from "@/components/admin/avisos-admin"
import { estadoDeParam, ListaPorAprobar, rolDeParam } from "@/components/admin/lista-cuentas"
import { cargarCuentas } from "@/lib/datos/admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Por aprobar · Administración · Línea Auxiliar" }

// Por aprobar (§8): cuentas nuevas de choferes y pasajeros, para verificar y decidir
export default async function PaginaPorAprobar({ searchParams }: PageProps<"/admin/aprobar">) {
  await exigirAdmin()
  const { estado, rol } = await searchParams
  const { cuentas, error } = await cargarCuentas()

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl leading-tight font-bold">Por aprobar</h1>
        <p className="text-muted-foreground">Revisa la foto y los datos (del chofer, también la placa y el carro) antes de aprobar.</p>
      </header>
      <AvisosAdmin />
      <ListaPorAprobar
        estado={estadoDeParam(typeof estado === "string" ? estado : undefined)}
        rol={rolDeParam(typeof rol === "string" ? rol : undefined)}
        cuentas={cuentas}
        error={error}
      />
    </div>
  )
}
