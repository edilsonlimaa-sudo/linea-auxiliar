import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Screen } from "@/components/nueva/app/screen"
import { LlegasteBien } from "@/components/nueva/pasajero/viaje-terminado"
import { cargarCalificacionPendiente } from "@/lib/datos/inicio-pasajero"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Llegaste bien · Línea Auxiliar" }

// Pantalla de paso al terminar el viaje (R45): sin pestañas; calificar, "Ahora no" o la ✕ llevan a Inicio
export default async function Llegaste() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const pendiente = await cargarCalificacionPendiente(perfil.id)
  if (!pendiente) redirect("/n")

  return (
    <Screen>
      <LlegasteBien viaje={pendiente} />
    </Screen>
  )
}
