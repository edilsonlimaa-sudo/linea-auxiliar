import type { Metadata } from "next"
import Link from "next/link"

import { ComoSeCuenta, DemandaPorDia, DemandaPorHora, TotalesDemanda } from "@/components/admin/demanda-oferta"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { cargarDemandaOferta, DIAS, type Dias, PERIODOS, type Periodo } from "@/lib/datos/demanda"
import { exigirAdmin } from "@/lib/sesion"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Demanda y oferta · Administración · Línea Auxiliar" }

const fecha = (d: string) => new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))

// Demanda y oferta (§8, R87): a qué hora quiere viajar la gente, cuánta se lleva y cuántos carros salen
export default async function PaginaDemanda({ searchParams }: PageProps<"/admin/demanda">) {
  await exigirAdmin()
  const { periodo: p, dias: d } = await searchParams
  const periodo: Periodo = PERIODOS.find((x) => x.id === p)?.id ?? "7"
  const dias: Dias = DIAS.find((x) => x.id === d)?.id ?? "semana"
  const datos = await cargarDemandaOferta(periodo, dias)
  const enlace = (cambio: { periodo?: Periodo; dias?: Dias }) => `/admin/demanda?periodo=${cambio.periodo ?? periodo}&dias=${cambio.dias ?? dias}`

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl leading-tight font-bold">Demanda y oferta</h1>
        <p className="text-muted-foreground">
          A qué hora quiere viajar la gente, cuántos se llevan y cuántos carros salen.{" "}
          {periodo === "hoy"
            ? "Hoy, hasta ahora."
            : `Del ${fecha(datos.desde)} al ${fecha(datos.hasta)} · ${datos.dias} ${datos.dias === 1 ? "día" : "días"}.`}
        </p>
      </header>

      <div className="flex flex-col gap-2">
        <Filtro etiqueta="Período" opciones={PERIODOS} activo={periodo} href={(id) => enlace({ periodo: id })} />
        {periodo !== "hoy" && <Filtro etiqueta="Días" opciones={DIAS} activo={dias} href={(id) => enlace({ dias: id })} />}
      </div>

      {datos.error ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar la demanda: {datos.error}</AlertTitle>
        </Alert>
      ) : (
        <>
          <TotalesDemanda datos={datos} />
          <section aria-labelledby="por-hora" className="flex flex-col gap-3">
            <h2 id="por-hora" className="text-base font-bold">
              Por hora
            </h2>
            <DemandaPorHora horas={datos.porHora} promedio={datos.dias > 1} />
          </section>
          {periodo !== "hoy" && (
            <section aria-labelledby="por-dia" className="flex flex-col gap-3">
              <h2 id="por-dia" className="text-base font-bold">
                Por día
              </h2>
              <DemandaPorDia dias={datos.porDia} />
            </section>
          )}
          <ComoSeCuenta />        </>
      )}
    </div>
  )
}

function Filtro<T extends string>({ etiqueta, opciones, activo, href }: { etiqueta: string; opciones: readonly { id: T; titulo: string }[]; activo: T; href: (id: T) => string }) {
  return (
    <nav aria-label={etiqueta} className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <Link
          key={o.id}
          href={href(o.id)}
          aria-current={o.id === activo ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center rounded-full border-2 px-4 font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
            o.id === activo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          {o.titulo}
        </Link>
      ))}
    </nav>
  )
}
