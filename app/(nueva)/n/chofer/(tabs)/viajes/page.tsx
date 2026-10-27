import { ChevronRight, Star, Users } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { promedio } from "@/components/nueva/pasajero/estrellas"
import { Badge } from "@/components/nueva/ui/badge"
import { cargarViajesChofer } from "@/lib/datos/historial"
import { diaYHora } from "@/lib/fechas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { duracion, SENTIDOS, sumaPersonas } from "@/lib/viajes"

export const metadata: Metadata = { title: "Viajes · Línea Auxiliar" }

// Mis viajes del chofer (R50): los últimos 20 terminados; cada uno abre a quién llevó y cómo le fue
export default async function ViajesChofer() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const viajes = await cargarViajesChofer(perfil.id)

  return (
    <Screen>
      <AppHeader title="Viajes" />
      <div className="flex flex-col gap-4 p-4">
        {viajes.length === 0 ? (
          <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Todavía no terminaste ningún viaje. Cuando termines uno, aquí ves a quién llevaste y cómo te calificaron.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{viajes.length === 1 ? "Tu último viaje terminado." : `Tus últimos ${viajes.length} viajes terminados.`}</p>
            <ul className="divide-y rounded-3xl border bg-card">
              {viajes.map((v) => {
                const llevo = sumaPersonas(v.llevo)
                const estrellas = v.calificaciones.length ? v.calificaciones.reduce((s, c) => s + c.estrellas, 0) / v.calificaciones.length : null
                return (
                  <li key={v.id}>
                    <Link href={`/n/chofer/viajes/${v.id}`} transitionTypes={["nav-forward"]} className="flex items-center gap-3 p-3 transition-colors active:bg-muted">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Users className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{SENTIDOS[v.sentido].corto}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {v.salida ? diaYHora(v.salida) : diaYHora(v.cerrado)}
                          {v.minutos !== null ? ` · ${duracion(v.minutos)}` : ""}
                        </p>
                      </div>
                      {estrellas !== null ? (
                        <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          {promedio(estrellas)}
                        </span>
                      ) : null}
                      <Badge variant={llevo > 0 ? "secondary" : "outline"}>{llevo === 0 ? "Vacío" : llevo === 1 ? "1 persona" : `${llevo} personas`}</Badge>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </Screen>
  )
}
