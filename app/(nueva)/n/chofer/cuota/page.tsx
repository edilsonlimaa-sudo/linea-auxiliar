import type { Metadata } from "next"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { CuotaPantalla } from "@/components/nueva/chofer/cuota"
import { cargarCuotaChofer } from "@/lib/datos/cuota"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Cuota del día · Línea Auxiliar" }

// La cuota del día (§5.18, R76–R77): cómo pagarla y el aviso del pago. Se actualiza sola cuando el admin decide
export default async function Cuota() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const cuota = await cargarCuotaChofer(perfil.id)

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="Cuota del día" backHref="/n/chofer" />
      <div className="flex flex-col gap-4 p-4">
        {cuota ? (
          <CuotaPantalla cuota={cuota} />
        ) : (
          <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Hoy no hay cuota: puedes publicar tus viajes.</p>
        )}
      </div>
    </Screen>
  )
}
