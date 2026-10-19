import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { ChoferesLinea } from "@/components/historial/choferes-linea"
import { cargarChoferes } from "@/lib/datos/historial"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Choferes · Línea Auxiliar" }

// Choferes de la línea (docs/especificacion.md R46): solo en la app del pasajero
export default async function PaginaChoferes() {
  const perfil = await exigirCuentaAprobada()
  if (perfil.rol !== "pasajero") redirect("/inicio")

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] leading-tight font-bold">Choferes</h1>
        <p className="text-muted-foreground">Los choferes verificados de la línea y lo que dicen los pasajeros.</p>
      </div>
      <ChoferesLinea choferes={await cargarChoferes(perfil.id)} />
    </div>
  )
}
