import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CalificacionesVista } from "@/components/admin/calificaciones"
import { buttonVariants } from "@/components/ui/button"
import { cargarNombreChofer } from "@/lib/datos/personas-admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Calificaciones del chofer · Administración · Línea Auxiliar" }

// Todas las calificaciones de un chofer (§8, detalle del chofer), con quién calificó
export default async function PaginaCalificacionesChofer({ params, searchParams }: PageProps<"/admin/choferes/[id]/calificaciones">) {
  await exigirAdmin()
  const { id } = await params
  const nombre = await cargarNombreChofer(id)
  if (!nombre) notFound()

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/admin/choferes/${id}`} className={buttonVariants({ variant: "ghost", className: "self-start" })}>
        ← {nombre}
      </Link>
      <h1 className="text-xl leading-tight font-bold">Calificaciones de {nombre}</h1>
      <CalificacionesVista base={`/admin/choferes/${id}/calificaciones`} params={await searchParams} choferFijo={id} periodoPorDefecto="todo" />
    </div>
  )
}
