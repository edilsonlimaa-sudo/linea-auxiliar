import { ChevronRight, Star } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { promedio } from "@/components/nueva/pasajero/estrellas"
import { Badge } from "@/components/nueva/ui/badge"
import { cargarFueraDeServicio } from "@/lib/datos/companeros"
import { cargarInicioChofer } from "@/lib/datos/inicio-chofer"
import { situacionDe } from "@/lib/nueva/companeros"
import { ahoraDelPedido } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { iniciales, SENTIDOS } from "@/lib/viajes"

export const metadata: Metadata = { title: "Compañeros · Línea Auxiliar" }

/**
 * Compañeros (R84, como Choferes del pasajero): quién trabaja ahora, qué hace y qué viene después (R7, §8); al tocar,
 * su detalle con WhatsApp, Llamar y el mapa. Debajo, los que están fuera de servicio y cuándo vuelven (R60).
 */
export default async function Companeros() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const ahora = ahoraDelPedido()
  const [{ companeros, viajesCompaneros }, fuera] = await Promise.all([
    cargarInicioChofer(perfil.id, perfil.conectado_en !== null),
    cargarFueraDeServicio(perfil.id, ahora),
  ])

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="Compañeros" />
      <div className="flex flex-col gap-6 p-4">
        <section className="flex flex-col gap-3">
          <Titulo texto="Trabajando ahora" n={companeros.length} />
          {companeros.length === 0 ? (
            <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nadie más está trabajando ahora.</p>
          ) : (
            <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
              {companeros.map((c) => {
                const s = situacionDe(c.id, viajesCompaneros, ahora)
                return (
                  <li key={c.id}>
                    <Link href={`/n/chofer/companeros/${c.id}`} transitionTypes={["nav-forward"]} className="flex items-center gap-3 p-3 transition-colors active:bg-muted">
                      <ChoferAvatar chofer={{ nombre: c.nombre, iniciales: iniciales(c.nombre), fotoUrl: c.fotoUrl }} />
                      <div className="min-w-0 flex-1">
                        <Nombre nombre={c.nombre} estrellas={c.estrellas} />
                        <p className="flex min-w-0 items-center gap-1.5 text-sm">
                          {s.sentido ? <Badge variant="secondary">{SENTIDOS[s.sentido].corto}</Badge> : null}
                          <span className={s.sentido ? "truncate font-medium" : "truncate text-muted-foreground"}>{s.ahora}</span>
                        </p>
                        {s.lleva || s.despues.length > 0 ? (
                          <p className="truncate text-xs text-muted-foreground">{[s.lleva, s.despues[0] && `Después: ${s.despues[0]}`].filter(Boolean).join(" · ")}</p>
                        ) : null}
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {fuera.length > 0 ? (
          <section className="flex flex-col gap-3">
            <Titulo texto="Fuera de servicio" n={fuera.length} />
            <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
              {fuera.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3">
                  <ChoferAvatar chofer={{ nombre: c.nombre, iniciales: iniciales(c.nombre), fotoUrl: c.fotoUrl }} className="opacity-70" />
                  <div className="min-w-0 flex-1">
                    <Nombre nombre={c.nombre} estrellas={c.estrellas} />
                    <p className="truncate text-sm text-muted-foreground">
                      {c.vuelta ?? [c.placa, c.unidad && `Unidad ${c.unidad}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Screen>
  )
}

function Titulo({ texto, n }: { texto: string; n: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-heading text-lg font-semibold">{texto}</h2>
      <span className="text-sm text-muted-foreground">{n}</span>
    </div>
  )
}

function Nombre({ nombre, estrellas }: { nombre: string; estrellas: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <p className="truncate font-heading font-semibold">{nombre}</p>
      {estrellas !== null ? (
        <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
          <Star className="size-3 fill-amber-400 text-amber-400" />
          {promedio(estrellas)}
        </span>
      ) : null}
    </div>
  )
}
