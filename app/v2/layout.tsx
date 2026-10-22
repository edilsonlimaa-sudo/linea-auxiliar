import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { CascaV2 } from "@/components/v2/casca"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Línea Auxiliar · v2" }

// Diseño nuevo del pasajero (v2, en construcción): un app aparte en /v2, hecho de cero. Solo entran los pasajeros
// marcados en la base (perfiles.diseno_v2); los demás vuelven al app de siempre, que no cambia para nadie
export default async function LayoutV2({ children }: { children: React.ReactNode }) {
  const perfil = await exigirCuentaAprobada()
  if (perfil.rol !== "pasajero" || !perfil.diseno_v2) redirect("/inicio")
  return <CascaV2>{children}</CascaV2>
}
