import { ChevronRight, IdCard } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { CerrarSesionDrawer, OpinionAppDrawer, SugerenciaDrawer } from "@/components/nueva/pasajero/menu"
import { firmarFotos } from "@/lib/fotos"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { iniciales } from "@/lib/viajes"

export const metadata: Metadata = { title: "Menú · Línea Auxiliar" }

// Menú del pasajero en la interfaz nueva: su carnet, sugerencias (R81), opinión sobre la app (R82) y salir
export default async function Menu() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const fotos = await firmarFotos([perfil.foto_path])
  const fotoUrl = perfil.foto_path ? (fotos.get(perfil.foto_path) ?? null) : null

  return (
    <Screen>
      <AppHeader title="Menú" />
      <div className="flex flex-col gap-6 p-4">
        <Link href="/n/carnet" transitionTypes={["nav-forward"]} className="flex items-center gap-4 rounded-3xl border bg-card p-4 transition-colors active:bg-muted">
          <ChoferAvatar chofer={{ nombre: perfil.nombre, iniciales: iniciales(perfil.nombre), fotoUrl }} className="size-14 text-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg font-semibold">{perfil.nombre}</p>
            {perfil.urbanismo ? <p className="truncate text-sm text-muted-foreground">{perfil.urbanismo}</p> : null}
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary">
              <IdCard className="size-3.5" /> Mi carnet
            </p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>

        <section className="divide-y rounded-3xl border bg-card">
          <SugerenciaDrawer />
          <OpinionAppDrawer />
        </section>

        <section className="rounded-3xl border bg-card">
          <CerrarSesionDrawer />
        </section>

        <p className="text-center text-xs text-muted-foreground">Línea Auxiliar Valle Grande</p>
      </div>
    </Screen>
  )
}
