import { ChevronRight, Star } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { ViewTransition } from "react"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { promedio } from "@/components/nueva/pasajero/estrellas"
import { cargarChoferes, type ChoferDeLaLinea } from "@/lib/datos/historial"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { iniciales } from "@/lib/viajes"

export const metadata: Metadata = { title: "Choferes · Línea Auxiliar" }

// Choferes de la línea (R46): primero los que trabajan; cada uno abre su perfil
export default async function Choferes() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const choferes = await cargarChoferes(perfil.id)
  const trabajando = choferes.filter((c) => c.trabajando)
  const fuera = choferes.filter((c) => !c.trabajando)

  return (
    <Screen>
      <AppHeader title="Choferes" />
      <div className="flex flex-col gap-6 p-4">
        <p className="text-sm text-muted-foreground">Los choferes verificados de la línea y lo que dicen los pasajeros.</p>
        <Grupo titulo="Trabajando ahora" choferes={trabajando} vacio="Nadie está trabajando en este momento." />
        {fuera.length > 0 ? <Grupo titulo="Fuera de servicio" choferes={fuera} /> : null}
      </div>
    </Screen>
  )
}

function Grupo({ titulo, choferes, vacio }: { titulo: string; choferes: ChoferDeLaLinea[]; vacio?: string }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold">{titulo}</h2>
        <span className="text-sm text-muted-foreground">{choferes.length}</span>
      </div>
      {choferes.length === 0 ? (
        vacio ? <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">{vacio}</p> : null
      ) : (
        <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
          {choferes.map((c) => (
            <li key={c.id}>
              <Link href={`/n/choferes/${c.id}`} transitionTypes={["nav-forward"]} className="flex items-center gap-3 p-3 transition-colors active:bg-muted">
                <ViewTransition name={`chofer-${c.id}`} share="morph" default="none">
                  <ChoferAvatar chofer={{ nombre: c.nombre, iniciales: iniciales(c.nombre), fotoUrl: c.fotoUrl }} />
                </ViewTransition>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-heading font-semibold">{c.nombre}</p>
                    {c.promedio !== null ? (
                      <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        {promedio(c.promedio)}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {[c.vehiculo?.modelo, c.vehiculo?.color].filter(Boolean).join(" ") || "Carro"}
                    {c.vehiculo ? ` · ${c.vehiculo.placa}` : ""}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
