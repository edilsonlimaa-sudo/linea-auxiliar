import { ChevronLeftIcon, StarIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { NavAdmin } from "@/components/admin/nav-admin"
import { promedioTexto } from "@/components/estrellas"
import { ViajesChofer } from "@/components/historial/viajes-chofer"
import { cargarCuentas, pendientesPorRol } from "@/lib/datos/admin"
import { cargarViajesTerminadosAdmin } from "@/lib/datos/historial"
import { inicioDelDia } from "@/lib/fechas"
import { exigirAdmin } from "@/lib/sesion"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Viajes terminados · Administración · Línea Auxiliar" }

const PERIODOS = [
  { id: "hoy", titulo: "Hoy", dias: 0 },
  { id: "7", titulo: "7 días", dias: 6 },
  { id: "30", titulo: "30 días", dias: 29 },
] as const

// Viajes terminados de toda la línea (§8), con filtro de período y el total arriba
export default async function PaginaTerminados({ searchParams }: PageProps<"/admin/viajes/terminados">) {
  await exigirAdmin()
  const { periodo: param } = await searchParams
  const periodo = PERIODOS.find((p) => p.id === param) ?? PERIODOS[1]
  const [{ cuentas }, viajes] = await Promise.all([cargarCuentas(), cargarViajesTerminadosAdmin(inicioDelDia(periodo.dias))])

  const pasajeros = viajes.reduce((n, v) => n + v.llevo.length, 0)
  const califs = viajes.flatMap((v) => v.calificaciones)
  const promedio = califs.length ? califs.reduce((n, c) => n + c.estrellas, 0) / califs.length : null

  return (
    <div className="flex flex-col gap-5">
      <NavAdmin activa="resumen" pendientes={pendientesPorRol(cuentas)} />
      <header className="flex flex-col gap-1">
        <Link
          href="/admin/viajes"
          className="-ml-1 inline-flex min-h-11 w-fit items-center gap-1 rounded-md font-bold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ChevronLeftIcon aria-hidden className="size-5" /> Viajes en curso
        </Link>
        <h1 className="text-[26px] leading-tight font-bold">Viajes terminados</h1>
      </header>

      <nav aria-label="Período" className="flex gap-2">
        {PERIODOS.map((p) => {
          const activo = p.id === periodo.id
          return (
            <Link
              key={p.id}
              href={`/admin/viajes/terminados?periodo=${p.id}`}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-full border-2 px-4 font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                activo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {p.titulo}
            </Link>
          )
        })}
      </nav>

      <div className="grid grid-cols-3 gap-2">
        <Total valor={viajes.length} texto={viajes.length === 1 ? "viaje" : "viajes"} />
        <Total valor={pasajeros} texto={pasajeros === 1 ? "pasajero llevado" : "pasajeros llevados"} />
        <Total
          valor={
            promedio !== null ? (
              <span className="inline-flex items-center gap-1">
                <StarIcon aria-hidden className="size-6 fill-signal text-signal" />
                {promedioTexto(promedio)}
              </span>
            ) : (
              "—"
            )
          }
          texto={califs.length === 1 ? "1 calificación" : `${califs.length} calificaciones`}
        />
      </div>
      {viajes.length === 100 && <p className="text-[15px] text-muted-foreground">Se muestran los 100 más recientes.</p>}

      <ViajesChofer viajes={viajes} admin />
    </div>
  )
}

function Total({ valor, texto }: { valor: React.ReactNode; texto: string }) {
  return (
    <div className="flex min-h-24 flex-col justify-between gap-2 rounded-2xl border-2 bg-card p-3">
      <span className="text-[28px] leading-none font-bold tabular-nums">{valor}</span>
      <span className="text-sm leading-tight text-muted-foreground">{texto}</span>
    </div>
  )
}
