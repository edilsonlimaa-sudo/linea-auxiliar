import type { Metadata } from "next"

import { Proximamente } from "@/components/app/proximamente"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Choferes · Línea Auxiliar" }

export default async function PaginaChoferes() {
  await exigirCuentaAprobada()
  return <Proximamente titulo="Choferes" contenido="Aquí vas a ver a los choferes de la línea, sus estrellas y comentarios, y calificar tus viajes." />
}
