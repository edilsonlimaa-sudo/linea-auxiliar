import type { Metadata } from "next"
import Link from "next/link"

import {
  PasajerosQueUsan,
  UsoNumeros,
  UsoPorChoferLista,
} from "@/components/admin/uso"
import { cargarUso } from "@/lib/datos/admin"
import { inicioDelDia } from "@/lib/fechas"
import { exigirAdmin } from "@/lib/sesion"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Uso de la app · Administración · Línea Auxiliar",
}

const PERIODOS = [
  { id: "7", titulo: "7 días", dias: 6 },
  { id: "30", titulo: "30 días", dias: 29 },
  { id: "90", titulo: "90 días", dias: 89 },
] as const

// Uso de la app (§8, Resumen punto 5): cómo entran los pasajeros al carro, por chofer, y quiénes viajan con su cuenta
export default async function PaginaUso({
  searchParams,
}: PageProps<"/admin/uso">) {
  await exigirAdmin()
  const { periodo: param } = await searchParams
  const periodo = PERIODOS.find((p) => p.id === param) ?? PERIODOS[0]
  const uso = await cargarUso(inicioDelDia(periodo.dias), { conFotos: true })

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-bold">Uso de la app</h1>
        <p className="text-muted-foreground">
          Pasajeros llevados en viajes terminados.
        </p>
      </header>

      <nav aria-label="Período" className="flex gap-2">
        {PERIODOS.map((p) => {
          const activo = p.id === periodo.id
          return (
            <Link
              key={p.id}
              href={`/admin/uso?periodo=${p.id}`}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-full border-2 px-4 font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                activo
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {p.titulo}
            </Link>
          )
        })}
      </nav>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section className="rounded-3xl border-2 bg-card p-4">
          <UsoNumeros uso={uso} />
        </section>

        {uso.porChofer.length > 0 && (
          <section
            aria-labelledby="uso-choferes"
            className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4"
          >
            <h2 id="uso-choferes" className="text-lg font-bold">
              Por chofer
            </h2>
            <UsoPorChoferLista choferes={uso.porChofer} />
          </section>
        )}
      </div>

      <section aria-labelledby="uso-pasajeros" className="flex flex-col gap-3">
        <h2 id="uso-pasajeros" className="text-xl font-bold">
          Quiénes viajan con su cuenta
        </h2>
        <PasajerosQueUsan pasajeros={uso.pasajeros} />
      </section>
    </div>
  )
}
