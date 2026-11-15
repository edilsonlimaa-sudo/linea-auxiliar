import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { CuotaDia } from "@/components/chofer/cuota-dia"
import { EnVivo } from "@/components/en-vivo"
import { buttonVariants } from "@/components/ui/button"
import { cargarCuotaChofer } from "@/lib/datos/cuota"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Aporte del día · Línea Auxiliar" }

// Aporte del día del chofer, voluntario (docs/especificacion.md §5.18, R76–R77): aportar y avisar la referencia
export default async function PaginaCuota() {
  const perfil = await exigirCuentaAprobada()
  if (perfil.rol !== "chofer") redirect("/inicio")
  const cuota = await cargarCuotaChofer(perfil.id)

  return (
    <div className="flex flex-col gap-4">
      <EnVivo />
      <Link href="/inicio" className={buttonVariants({ variant: "ghost", className: "self-start" })}>
        <ArrowLeftIcon aria-hidden />
        Inicio
      </Link>
      <h1 className="text-xl font-bold">Aporte del día</h1>
      {cuota ? (
        <CuotaDia cuota={cuota} />
      ) : (
        <p className="rounded-2xl border-2 border-dashed px-4 py-6 text-center text-muted-foreground">
          Hoy no se pide aporte. ¡Buen trabajo!
        </p>
      )}
    </div>
  )
}
