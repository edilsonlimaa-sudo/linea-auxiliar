import type { Metadata } from "next"

import { Demanda } from "@/components/admin/demanda"
import { NavAdmin } from "@/components/admin/nav-admin"
import { EnVivo } from "@/components/en-vivo"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { cargarCuentas, cargarDemanda, pendientesPorRol } from "@/lib/datos/admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Demanda · Administración · Línea Auxiliar" }

// Demanda del panel (§8): quién espera y si alcanza el transporte. Se actualiza sola (EnVivo).
export default async function PaginaDemanda() {
  await exigirAdmin()
  const [{ cuentas }, { esperando, oferta, hoy, error }] = await Promise.all([cargarCuentas(), cargarDemanda()])

  return (
    <div className="flex flex-col gap-5">
      <EnVivo />
      <NavAdmin activa="demanda" pendientes={pendientesPorRol(cuentas)} />
      <header className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-bold">Demanda</h1>
        <p className="text-muted-foreground">Quién espera transporte ahora. Se actualiza sola.</p>
      </header>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar la demanda: {error}</AlertTitle>
        </Alert>
      ) : (
        <Demanda esperando={esperando} oferta={oferta} hoy={hoy} />
      )}
    </div>
  )
}
