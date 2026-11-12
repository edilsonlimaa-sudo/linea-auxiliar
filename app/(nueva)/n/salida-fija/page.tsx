import type { Metadata } from "next"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { SalidaFija } from "@/components/nueva/pasajero/salida-fija"
import { cargarMiRespuesta } from "@/lib/datos/salida-fija"
import { hace } from "@/lib/fechas"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Salida fija · Línea Auxiliar" }

// La salida fija (docs/especificacion.md §5.28, R108): la encuesta, solo para pasajeros de la nueva. Se llega con el
// botón de una notificación (R88)
export default async function PaginaSalidaFija() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const mia = await cargarMiRespuesta(perfil.id)

  return (
    <Screen>
      <AppHeader title="Salida fija de las 5" backHref="/n" />
      <div className="flex flex-col gap-4 p-4 pb-10">
        <SalidaFija mia={mia ? { ...mia, cuando: hace(mia.actualizadaEn) } : null} />
      </div>
    </Screen>
  )
}
