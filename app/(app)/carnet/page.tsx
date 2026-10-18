import type { Metadata } from "next"

import { Proximamente } from "@/components/app/proximamente"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Mi carnet · Línea Auxiliar" }

export default async function PaginaCarnet() {
  await exigirCuentaAprobada()
  return <Proximamente titulo="Mi carnet" contenido="Aquí vas a ver tu carnet de la línea con tus datos y tu foto." />
}
