import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { NavAdmin } from "@/components/admin/nav-admin"
import { ViajesEnCurso } from "@/components/admin/viajes-en-curso"
import { EnVivo } from "@/components/en-vivo"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { cargarCuentas, cargarViajesEnCurso, pendientesPorRol } from "@/lib/datos/admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Viajes en curso · Administración · Línea Auxiliar" }

// Viajes en curso (§8): se abre desde el Resumen. Se actualiza sola (EnVivo).
export default async function PaginaViajes() {
  await exigirAdmin()
  const [{ cuentas }, { choferes, error }] = await Promise.all([cargarCuentas(), cargarViajesEnCurso()])

  return (
    <div className="flex flex-col gap-5">
      <EnVivo />
      <NavAdmin activa="resumen" pendientes={pendientesPorRol(cuentas)} />
      <header className="flex flex-col gap-1">
        <Link
          href="/admin"
          className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-md font-bold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ChevronLeftIcon aria-hidden className="size-5" /> Resumen
        </Link>
        <h1 className="text-[26px] leading-tight font-bold">Viajes en curso</h1>
        <p className="text-muted-foreground">Quién va en cada carro y por dónde va. Se actualiza sola.</p>
        <Link href="/admin/viajes/terminados" className="mt-1 w-fit font-bold text-primary underline underline-offset-4">
          Ver viajes terminados
        </Link>
      </header>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar los viajes: {error}</AlertTitle>
        </Alert>
      ) : (
        <ViajesEnCurso choferes={choferes} />
      )}
    </div>
  )
}
