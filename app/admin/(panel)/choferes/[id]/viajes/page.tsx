import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ViajesCerrados } from "@/components/admin/viajes-cerrados"
import { buttonVariants } from "@/components/ui/button"
import { cargarNombreChofer } from "@/lib/datos/personas-admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Viajes del chofer · Administración · Línea Auxiliar" }

// Todos los viajes de un chofer (§8, detalle del chofer): como Viajes terminados, solo los suyos
export default async function PaginaViajesChofer({ params, searchParams }: PageProps<"/admin/choferes/[id]/viajes">) {
  await exigirAdmin()
  const { id } = await params
  const nombre = await cargarNombreChofer(id)
  if (!nombre) notFound()

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/admin/choferes/${id}`} className={buttonVariants({ variant: "ghost", className: "self-start" })}>
        ← {nombre}
      </Link>
      <h1 className="text-xl leading-tight font-bold">Viajes de {nombre}</h1>
      <ViajesCerrados
        base={`/admin/choferes/${id}/viajes`}
        params={await searchParams}
        choferId={id}
        porDefecto={{ estado: "todos", periodo: "todo" }}
      />
    </div>
  )
}
