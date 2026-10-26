import { ChevronRight, MapPin } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ChoferAvatar, personasLabel } from "@/components/nueva/pasajero/comunes"
import { Estrellas } from "@/components/nueva/pasajero/estrellas"
import { PagoMovilCard } from "@/components/nueva/pasajero/pago-movil-card"
import { CalificarDrawer } from "@/components/nueva/pasajero/viaje-terminado"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { cargarDetalleViaje } from "@/lib/nueva/datos"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { tarifaEn } from "@/lib/tarifas"
import { SENTIDOS } from "@/lib/viajes"

export const metadata: Metadata = { title: "Viaje · Línea Auxiliar" }

const cuando = (iso: string) =>
  new Intl.DateTimeFormat("es-VE", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(
    new Date(iso)
  )

// Un viaje hecho (R51): con quién, dónde lo recogieron, su calificación (o Calificar) y el Pago Móvil si todavía vale
export default async function DetalleViaje({ params }: PageProps<"/n/viajes/[id]">) {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const { id } = await params
  const v = /^[0-9a-f-]{36}$/i.test(id) ? await cargarDetalleViaje(perfil.id, id) : null
  if (!v) notFound()
  const { chofer } = v

  return (
    <Screen>
      <AppHeader title="Viaje" backHref="/n/viajes" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">{SENTIDOS[v.sentido].corto}</Badge>
            <span className="text-right text-sm text-muted-foreground first-letter:uppercase">{cuando(v.cuando)}</span>
          </div>
          <Link
            href={`/n/choferes/${chofer.id}`}
            transitionTypes={["nav-forward"]}
            className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3 transition-colors active:bg-muted"
          >
            <ChoferAvatar chofer={chofer} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading font-semibold">{chofer.nombre}</p>
              <p className="truncate text-sm text-muted-foreground">
                {[chofer.modelo, chofer.color].filter(Boolean).join(" ") || "Carro"}
                {chofer.placa ? ` · ${chofer.placa}` : ""}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Ruta</dt>
              <dd className="font-medium">{SENTIDOS[v.sentido].largo}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Personas</dt>
              <dd className="font-medium">{personasLabel(v.personas)}</dd>
            </div>
            {v.lugar ? (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Te recogieron en</dt>
                <dd className="flex items-center gap-1 font-medium">
                  <MapPin className="size-3.5 text-primary" /> {v.lugar}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        {v.pago ? <PagoMovilCard datos={v.pago} chofer={chofer.nombre} pasaje={tarifaEn(new Date(v.cuando))} /> : null}

        <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
          <h2 className="font-heading font-semibold">Tu calificación</h2>
          {v.calificacion ? (
            <>
              <Estrellas valor={v.calificacion.estrellas} tamano="size-6" />
              {v.calificacion.etiquetas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {v.calificacion.etiquetas.map((e) => (
                    <Badge key={e} variant="secondary">
                      {e}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {v.calificacion.comentario ? <p className="text-sm text-muted-foreground">{v.calificacion.comentario}</p> : null}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Todavía no calificaste este viaje.</p>
              <CalificarDrawer
                viaje={{ viajeId: v.viajeId, choferId: chofer.id, chofer: chofer.nombre }}
                volver={`/n/viajes/${v.reservaId}`}
                trigger={<Button size="lg">Calificar viaje</Button>}
              />
            </>
          )}
        </section>
      </div>
    </Screen>
  )
}
