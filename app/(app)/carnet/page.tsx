import type { Metadata } from "next"

import { CarnetVista } from "@/components/carnet"
import { cargarCarnet } from "@/lib/datos/historial"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Mi carnet · Línea Auxiliar" }

// Mi carnet (docs/especificacion.md R53): pasajero y chofer
export default async function PaginaCarnet() {
  const perfil = await exigirCuentaAprobada()
  return <CarnetVista carnet={await cargarCarnet(perfil)} />
}
