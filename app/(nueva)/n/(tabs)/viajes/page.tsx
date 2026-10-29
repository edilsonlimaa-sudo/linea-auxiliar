import { Building2, ChevronRight, History, Home, Star } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { Estrellas } from "@/components/nueva/pasajero/estrellas"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { cargarViajesPasajero, type ViajePasajero } from "@/lib/datos/historial"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { SENTIDOS } from "@/lib/viajes"

export const metadata: Metadata = { title: "Mis viajes · Línea Auxiliar" }

const ZONA = "America/Caracas"
const diaDe = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d) // 2026-10-28
const hora = (iso: string) => new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit", timeZone: ZONA }).format(new Date(iso))

// "Hoy", "Ayer" o "mié, 28 oct"
function tituloDelDia(dia: string) {
  const ahora = new Date()
  if (dia === diaDe(ahora)) return "Hoy"
  if (dia === diaDe(new Date(ahora.getTime() - 86_400_000))) return "Ayer"
  const fecha = new Date(`${dia}T12:00:00-04:00`)
  return new Intl.DateTimeFormat("es-VE", { weekday: "short", day: "numeric", month: "short", timeZone: ZONA }).format(fecha).replace(/\./g, "")
}

function porDia(viajes: ViajePasajero[]) {
  const grupos = new Map<string, ViajePasajero[]>()
  for (const v of viajes) {
    const dia = diaDe(new Date(v.cuando))
    grupos.set(dia, [...(grupos.get(dia) ?? []), v])
  }
  return [...grupos].map(([dia, lista]) => ({ dia, titulo: tituloDelDia(dia), lista }))
}

// Mis viajes (R51): los que hizo de verdad, el más reciente primero, por día; los sin calificar lo dicen arriba y en la fila
export default async function MisViajes() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const viajes = await cargarViajesPasajero(perfil.id)
  const porCalificar = viajes.filter((v) => v.estrellas === null).length

  return (
    <Screen>
      <AppHeader title="Mis viajes" />
      <div className="flex flex-col gap-5 p-4">
        {viajes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <History className="size-7" />
            </div>
            <p className="font-heading text-lg font-semibold">Todavía no has viajado con la Línea</p>
            <p className="text-sm text-muted-foreground">
              Cuando viajes, aquí vas a ver cada viaje con su chofer y su carro, y podrás calificarlo.
            </p>
            <Button render={<Link href="/n" />} nativeButton={false} size="lg" className="mt-2">
              Buscar un carro
            </Button>
          </div>
        ) : (
          <>
            {porCalificar > 0 ? (
              <div className="flex items-start gap-3 rounded-3xl bg-secondary p-4 text-secondary-foreground">
                <Star className="mt-0.5 size-5 shrink-0 fill-amber-400 text-amber-400" />
                <div>
                  <p className="font-medium">
                    {porCalificar === 1 ? "Tienes 1 viaje por calificar" : `Tienes ${porCalificar} viajes por calificar`}
                  </p>
                  <p className="text-sm text-muted-foreground">Tu opinión ayuda a otros pasajeros a escoger y al chofer a mejorar.</p>
                </div>
              </div>
            ) : (
              <p className="px-1 text-sm text-muted-foreground">Tus últimos viajes con la Línea. Toca uno para ver el detalle.</p>
            )}
            {porDia(viajes).map(({ dia, titulo, lista }) => (
              <section key={dia} className="flex flex-col gap-2">
                <h2 className="px-1 text-sm font-medium text-muted-foreground first-letter:uppercase">{titulo}</h2>
                <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
                  {lista.map((v) => (
                    <li key={v.reservaId}>
                      <FilaViaje viaje={v} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </Screen>
  )
}

function FilaViaje({ viaje: v }: { viaje: ViajePasajero }) {
  const Icono = v.sentido === "vg_a_centro" ? Building2 : Home
  const carro = [v.unidad ? `Unidad ${v.unidad}` : null, v.placa].filter(Boolean).join(" · ")
  return (
    <Link href={`/n/viajes/${v.reservaId}`} transitionTypes={["nav-forward"]} className="flex items-center gap-3 p-3 transition-colors active:bg-muted">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icono className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="truncate font-heading font-semibold">{SENTIDOS[v.sentido].corto}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{hora(v.cuando)}</span>
        </p>
        <p className="truncate text-sm text-muted-foreground">{v.chofer}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">
            {carro}
            {v.seBajoAntes ? `${carro ? " · " : ""}se bajó antes` : ""}
          </span>
          {v.estrellas !== null ? <Estrellas valor={v.estrellas} tamano="size-3.5" className="shrink-0" /> : <Badge className="shrink-0">Calificar</Badge>}
        </div>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}
