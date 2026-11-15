import type { Metadata } from "next"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { CuotaPantalla } from "@/components/nueva/chofer/cuota"
import { cargarCuotaChofer } from "@/lib/datos/cuota"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Aporte del día · Línea Auxiliar" }

// El aporte del día, voluntario (§5.18, R76–R77): cómo aportar y el aviso. Se actualiza solo cuando el admin decide
export default async function Cuota() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const cuota = await cargarCuotaChofer(perfil.id)

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="Aporte del día" backHref="/n/chofer" />
      <div className="flex flex-col gap-4 p-4">
        {cuota ? (
          <CuotaPantalla cuota={cuota} />
        ) : (
          <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Hoy no se pide aporte. ¡Buen trabajo!</p>
        )}
      </div>
    </Screen>
  )
}
