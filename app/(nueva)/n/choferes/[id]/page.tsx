import { Car, Snowflake, Star } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ViewTransition } from "react"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { Estrellas, promedio } from "@/components/nueva/pasajero/estrellas"
import { Badge } from "@/components/nueva/ui/badge"
import { cargarPerfilChofer } from "@/lib/nueva/datos"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Chofer · Línea Auxiliar" }

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", timeZone: "America/Caracas" }).format(new Date(iso)).replace(/\./g, "")

// El perfil de un chofer (R46): el carro, si trabaja y las opiniones de los pasajeros, sin nombres (R52)
export default async function PerfilChofer({ params }: PageProps<"/n/choferes/[id]">) {
  await exigirCuentaAprobada({ interfaz: "nueva" })
  const { id } = await params
  const c = /^[0-9a-f-]{36}$/i.test(id) ? await cargarPerfilChofer(id) : null
  if (!c) notFound()

  const conteo = new Map<string, number>()
  for (const o of c.opiniones) for (const e of o.etiquetas) conteo.set(e, (conteo.get(e) ?? 0) + 1)
  const destacados = [...conteo.entries()].sort((a, b) => b[1] - a[1])
  const conComentario = c.opiniones.filter((o) => o.comentario)

  return (
    <Screen>
      <AppHeader title="Chofer" backHref="/n/choferes" />
      <div className="flex flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <section className="flex flex-col items-center gap-3 py-2 text-center">
          <ViewTransition name={`chofer-${c.id}`} share="morph" default="none">
            <ChoferAvatar chofer={c} className="size-24 text-3xl" />
          </ViewTransition>
          <div>
            <h2 className="font-heading text-2xl font-semibold">{c.nombre}</h2>
            <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              {c.promedio !== null ? (
                <>
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  {promedio(c.promedio)} · {c.opiniones.length} {c.opiniones.length === 1 ? "calificación" : "calificaciones"}
                </>
              ) : (
                "Sin calificaciones aún"
              )}
            </p>
          </div>
          <Badge variant={c.trabajando ? "default" : "outline"}>{c.trabajando ? "Trabajando ahora" : "Fuera de servicio"}</Badge>
        </section>

        {c.carro ? (
          <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Car className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-semibold">{[c.carro.modelo, c.carro.color].filter(Boolean).join(" ") || "Carro"}</p>
                <p className="text-sm text-muted-foreground">
                  Placa {c.carro.placa}
                  {c.carro.unidad ? ` · Unidad ${c.carro.unidad}` : ""}
                </p>
              </div>
              {c.carro.aire ? (
                <Badge variant="outline">
                  <Snowflake className="size-3.5" />
                  Aire
                </Badge>
              ) : null}
            </div>
            {c.carro.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto del carro servida por /foto (R54)
              <img src={c.carro.fotoUrl} alt={`Carro de ${c.nombre}`} className="aspect-video w-full rounded-2xl object-cover" />
            ) : null}
            <p className="text-xs text-muted-foreground">El Pago Móvil del chofer aparece durante el viaje y hasta 3 horas después.</p>
          </section>
        ) : null}

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="font-heading text-lg font-semibold">Opiniones</h2>
            <span className="text-sm text-muted-foreground">{c.opiniones.length}</span>
          </div>
          {destacados.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {destacados.map(([e, n]) => (
                <Badge key={e} variant="secondary">
                  {e} · {n}
                </Badge>
              ))}
            </div>
          ) : null}
          {conComentario.length === 0 ? (
            <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {c.opiniones.length === 0 ? "Todavía nadie ha opinado." : "Nadie ha dejado comentarios todavía."}
            </p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
              {conComentario.slice(0, 20).map((o, i) => (
                <li key={i} className="flex flex-col gap-1 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Estrellas valor={o.estrellas} tamano="size-3.5" />
                    <span className="text-xs text-muted-foreground">{fecha(o.creadaEn)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{o.comentario}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Screen>
  )
}
