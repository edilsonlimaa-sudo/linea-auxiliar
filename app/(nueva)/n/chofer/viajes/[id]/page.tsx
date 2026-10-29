import { UserX } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { Estrellas, promedio } from "@/components/nueva/pasajero/estrellas"
import { Badge } from "@/components/nueva/ui/badge"
import { cargarViajesChofer, type PersonaDelViaje } from "@/lib/datos/historial"
import { diaYHora, hora } from "@/lib/fechas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { conAcompanantes, duracion, SENTIDOS, sumaPersonas } from "@/lib/viajes"

export const metadata: Metadata = { title: "Viaje · Línea Auxiliar" }

const ENTRADA: Record<PersonaDelViaje["entrada"], string> = {
  app: "Con la app",
  a_mano: "Anotado a mano",
  en_el_camino: "Recogido en el camino",
}

// Un viaje terminado del chofer (R50): cuándo salió y llegó, a quién llevó, quién no vino y las calificaciones, sin
// nombres (R52)
export default async function ViajeChofer({ params }: PageProps<"/n/chofer/viajes/[id]">) {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const { id } = await params
  const v = (await cargarViajesChofer(perfil.id)).find((x) => x.id === id)
  if (!v) notFound()
  const llevo = sumaPersonas(v.llevo)
  const estrellas = v.calificaciones.length ? v.calificaciones.reduce((s, c) => s + c.estrellas, 0) / v.calificaciones.length : null
  const comentarios = v.calificaciones.filter((c) => c.comentario)

  return (
    <Screen>
      <AppHeader title="Viaje" backHref="/n/chofer/viajes" />
      <div className="flex flex-col gap-4 p-4">
        <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{SENTIDOS[v.sentido].corto}</Badge>
            <span className="text-sm text-muted-foreground">{diaYHora(v.salida ?? v.cerrado)}</span>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Dato valor={String(llevo)} etiqueta={llevo === 1 ? "persona" : "personas"} />
            <Dato valor={v.minutos !== null ? duracion(v.minutos) : "—"} etiqueta="de ruta" />
            <Dato valor={`${llevo}/${v.puestos}`} etiqueta="puestos" />
          </dl>
          {v.salida && v.llegada ? (
            <p className="text-sm text-muted-foreground">
              Saliste a las {hora(v.salida)} y llegaste a las {hora(v.llegada)}.
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold">Llevaste</h2>
          {v.llevo.length === 0 ? (
            <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nadie en este viaje.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
              {v.llevo.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 p-3">
                  <span className="font-medium">{conAcompanantes(p.nombre, p.personas)}</span>
                  <span className="text-right text-sm text-muted-foreground">
                    {ENTRADA[p.entrada]}
                    {p.seBajoAntes ? " · se bajó antes" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {v.noVinieron.length > 0 ? (
          <section className="flex items-start gap-3 rounded-3xl border bg-card p-4">
            <UserX className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">No vinieron</p>
              <p className="text-sm text-muted-foreground">{v.noVinieron.join(", ")}</p>
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-semibold">Calificaciones</h2>
          {estrellas === null ? (
            <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nadie lo calificó todavía.</p>
          ) : (
            <div className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
              <p className="flex items-center gap-2">
                <Estrellas valor={estrellas} />
                <span className="text-sm text-muted-foreground">
                  {promedio(estrellas)} · {v.calificaciones.length === 1 ? "1 calificación" : `${v.calificaciones.length} calificaciones`}
                </span>
              </p>
              {comentarios.map((c, i) => (
                <blockquote key={i} className="rounded-2xl bg-muted/60 px-3 py-2 text-sm">
                  &ldquo;{c.comentario}&rdquo;
                </blockquote>
              ))}
            </div>
          )}
        </section>
      </div>
    </Screen>
  )
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-muted/60 p-3">
      <dd className="font-heading text-xl leading-none font-semibold tabular-nums">{valor}</dd>
      <dt className="mt-1 text-xs text-muted-foreground">{etiqueta}</dt>
    </div>
  )
}
