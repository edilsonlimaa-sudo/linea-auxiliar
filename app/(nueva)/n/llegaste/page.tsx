import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Screen } from "@/components/nueva/app/screen"
import { LlegasteBien } from "@/components/nueva/pasajero/viaje-terminado"
import { cargarCalificacionPendiente } from "@/lib/datos/inicio-pasajero"
import { contarEsferas } from "@/lib/datos/navidad"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { temporadaNavidad } from "@/lib/temporada"

export const metadata: Metadata = { title: "Llegaste bien · Línea Auxiliar" }

// Pantalla de paso al terminar el viaje (R45): sin pestañas; calificar, "Ahora no" o la ✕ llevan a Inicio
export default async function Llegaste() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const pendiente = await cargarCalificacionPendiente(perfil.id)
  if (!pendiente) redirect("/n")
  // R101: hasta el 24/12, la esfera que colgó este viaje
  const temporada = temporadaNavidad(new Date(), perfil.de_prueba)
  const esferas = temporada?.cuentaEsferas ? await contarEsferas(perfil.id) : null

  return (
    <Screen>
      <LlegasteBien viaje={pendiente} esferas={esferas} />
    </Screen>
  )
}
