import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { CalificacionesChofer } from "@/components/historial/calificaciones-chofer"
import { cargarCalificacionesChofer } from "@/lib/datos/historial"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Mis calificaciones · Línea Auxiliar" }

// Mis calificaciones del chofer (docs/especificacion.md R52): su propio espacio, fuera del carnet
export default async function PaginaCalificaciones() {
  const perfil = await exigirCuentaAprobada()
  if (perfil.rol !== "chofer") redirect("/inicio")

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl leading-tight font-bold">Mis calificaciones</h1>
        <p className="text-muted-foreground">Lo que dicen tus pasajeros al terminar cada viaje.</p>
      </div>
      <CalificacionesChofer resumen={await cargarCalificacionesChofer(perfil.id)} />
    </div>
  )
}
