import { Star } from "lucide-react"
import type { Metadata } from "next"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { Estrellas, promedio } from "@/components/nueva/pasajero/estrellas"
import { Badge } from "@/components/nueva/ui/badge"
import { cargarCalificacionesChofer } from "@/lib/datos/historial"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { SENTIDOS } from "@/lib/viajes"

export const metadata: Metadata = { title: "Mis calificaciones · Línea Auxiliar" }

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", timeZone: "America/Caracas" }).format(new Date(iso)).replace(/\./g, "")

// Mis calificaciones (R52): el promedio, cuántas de cada nota, lo que más destacan y las opiniones, sin nombres
export default async function CalificacionesChofer() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const r = await cargarCalificacionesChofer(perfil.id)

  return (
    <Screen>
      <AppHeader title="Calificaciones" />
      <div className="flex flex-col gap-4 p-4">
        <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="font-heading text-5xl leading-none font-semibold tabular-nums">{r.promedio !== null ? promedio(r.promedio) : "—"}</span>
              <Estrellas valor={r.promedio ?? 0} className="mt-1" tamano="size-3.5" />
              <span className="mt-1 text-xs text-muted-foreground">{r.cantidad === 1 ? "1 opinión" : `${r.cantidad} opiniones`}</span>
            </div>
            <ul className="flex flex-1 flex-col gap-1">
              {([5, 4, 3, 2, 1] as const).map((n) => (
                <li key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right tabular-nums">{n}</span>
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: r.cantidad ? `${(r.porEstrellas[n] / r.cantidad) * 100}%` : "0%" }} />
                  </div>
                  <span className="w-4 text-right text-muted-foreground tabular-nums">{r.porEstrellas[n]}</span>
                </li>
              ))}
            </ul>
          </div>
          {r.etiquetas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {r.etiquetas.map((e) => (
                <Badge key={e.etiqueta} variant="secondary">
                  {e.etiqueta} · {e.veces}
                </Badge>
              ))}
            </div>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-lg font-semibold">Opiniones</h2>
            <span className="text-xs text-muted-foreground">Sin nombres</span>
          </div>
          {r.recientes.length === 0 ? (
            <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía nadie te calificó.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
              {r.recientes.map((o, i) => (
                <li key={i} className="flex flex-col gap-1 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Estrellas valor={o.estrellas} />
                    <span className="text-xs text-muted-foreground">
                      {o.sentido ? `${SENTIDOS[o.sentido].corto} · ` : ""}
                      {fecha(o.creadoEn)}
                    </span>
                  </div>
                  {o.etiquetas.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {o.etiquetas.map((e) => (
                        <Badge key={e} variant="outline">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {o.comentario ? <p className="text-sm text-muted-foreground">{o.comentario}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Screen>
  )
}
