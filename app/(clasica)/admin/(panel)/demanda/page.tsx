import type { Metadata } from "next"

import { Demanda } from "@/components/admin/demanda"
import { EnVivo } from "@/components/en-vivo"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { cargarDemanda } from "@/lib/datos/admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Demanda · Administración · Línea Auxiliar" }

// Demanda del panel (§8): quién espera y si alcanza el transporte. Se actualiza sola (EnVivo).
export default async function PaginaDemanda() {
  await exigirAdmin()
  const { esperando, oferta, hoy, error } = await cargarDemanda()

  return (
    <div className="flex flex-col gap-4">
      <EnVivo />
      <header className="flex flex-col gap-1">
        <h1 className="text-xl leading-tight font-bold">Demanda</h1>
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
