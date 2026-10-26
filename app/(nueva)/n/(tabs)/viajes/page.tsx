import { ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { Estrellas } from "@/components/nueva/pasajero/estrellas"
import { Badge } from "@/components/nueva/ui/badge"
import { cargarViajesPasajero } from "@/lib/datos/historial"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { SENTIDOS } from "@/lib/viajes"

export const metadata: Metadata = { title: "Mis viajes · Línea Auxiliar" }

const cuando = (iso: string) => {
  const d = new Date(iso)
  const dia = new Intl.DateTimeFormat("es-VE", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Caracas" }).format(d).replace(/\./g, "")
  const hora = new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(d)
  return `${dia}, ${hora}`
}

// Mis viajes (R51): los que hizo de verdad, el más reciente primero; los sin calificar lo dicen
export default async function MisViajes() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const viajes = await cargarViajesPasajero(perfil.id)

  return (
    <Screen>
      <AppHeader title="Mis viajes" />
      <div className="flex flex-col gap-4 p-4">
        {viajes.length === 0 ? (
          <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía no has viajado con la línea.</p>
        ) : (
          <ul className="divide-y rounded-3xl border bg-card">
            {viajes.map((v) => (
              <li key={v.reservaId}>
                <Link href={`/n/viajes/${v.reservaId}`} transitionTypes={["nav-forward"]} className="flex items-center gap-3 p-3 transition-colors active:bg-muted">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {SENTIDOS[v.sentido].corto} · {v.chofer}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {cuando(v.cuando)}
                      {v.seBajoAntes ? " · se bajó antes" : ""}
                    </p>
                  </div>
                  {v.estrellas !== null ? <Estrellas valor={v.estrellas} tamano="size-3.5" /> : <Badge>Calificar</Badge>}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Screen>
  )
}
