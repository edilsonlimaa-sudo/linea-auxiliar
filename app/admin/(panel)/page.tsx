import { CheckCircle2Icon } from "lucide-react"
import type { Metadata } from "next"

import { Resumen } from "@/components/admin/resumen"
import { EnVivo } from "@/components/en-vivo"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { cargarCuentas, cargarResumen, cargarUso, cargarViajesEnCurso, pendientesPorRol } from "@/lib/datos/admin"
import { cargarListaGina } from "@/lib/datos/lista-gina"
import { hoyEnPalabras, inicioDelDia } from "@/lib/fechas"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Administración · Línea Auxiliar" }

// Resumen del panel (§8): el tablero. Se actualiza solo (EnVivo)
export default async function PanelAdmin({ searchParams }: PageProps<"/admin">) {
  await exigirAdmin()
  const { clave } = await searchParams
  const [{ cuentas }, resumen, uso, lista, { choferes }] = await Promise.all([
    cargarCuentas(),
    cargarResumen(),
    cargarUso(inicioDelDia(6)),
    cargarListaGina(),
    cargarViajesEnCurso(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <EnVivo />
      <header className="flex flex-col gap-1">
        <h1 className="text-xl leading-tight font-bold">Resumen</h1>
        <p className="text-muted-foreground first-letter:uppercase">{hoyEnPalabras()} · se actualiza solo</p>
      </header>

      {clave === "cambiada" && (
        <Alert variant="success">
          <CheckCircle2Icon aria-hidden />
          <AlertTitle>Contraseña cambiada</AlertTitle>
        </Alert>
      )}

      <Resumen
        cuentas={cuentas}
        resumen={resumen}
        pendientes={pendientesPorRol(cuentas)}
        uso={uso}
        enCurso={choferes}
        enLista={lista.reduce((n, e) => n + e.personas, 0)}
      />
    </div>
  )
}
