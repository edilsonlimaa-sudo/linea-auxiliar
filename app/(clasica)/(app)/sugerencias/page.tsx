import type { Metadata } from "next"

import { FormSugerencia } from "@/components/sugerencias/form-sugerencia"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Enviar una sugerencia · Línea Auxiliar" }

// Sugerencias al admin (docs/especificacion.md §5.20, R81): pasajeros y choferes
export default async function PaginaSugerencias() {
  await exigirCuentaAprobada()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">Enviar una sugerencia</h1>
        <p className="text-muted-foreground">Lo que escribas le llega al administrador de la línea. Lo lee todo.</p>
      </div>
      <FormSugerencia />
    </div>
  )
}
