import type { Metadata } from "next"

import { Proximamente } from "@/components/app/proximamente"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Mis viajes · Línea Auxiliar" }

export default async function PaginaMisViajes() {
  await exigirCuentaAprobada()
  return <Proximamente titulo="Mis viajes" contenido="Aquí vas a ver los viajes que has hecho y calificar al chofer." />
}
