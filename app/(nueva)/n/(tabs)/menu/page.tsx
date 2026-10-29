import type { Metadata } from "next"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { CerrarSesionDrawer, MiCarnetLink, OpinionAppDrawer, SugerenciaDrawer, TemaSelector } from "@/components/nueva/pasajero/menu"

export const metadata: Metadata = { title: "Menú · Línea Auxiliar" }

// Menú del pasajero en la interfaz nueva: su carnet, sugerencias (R81), opinión sobre la app (R82), apariencia (R85) y
// salir. Sin datos propios (el perfil viene del layout de las pestañas): la pestaña lo deja listo antes del toque
export default function Menu() {
  return (
    <Screen>
      <AppHeader title="Menú" />
      <div className="flex flex-col gap-6 p-4">
        <MiCarnetLink />

        <section className="divide-y overflow-hidden rounded-3xl border bg-card">
          <SugerenciaDrawer />
          <OpinionAppDrawer />
        </section>

        <section className="overflow-hidden rounded-3xl border bg-card">
          <TemaSelector />
        </section>

        <section className="overflow-hidden rounded-3xl border bg-card">
          <CerrarSesionDrawer />
        </section>

        <p className="text-center text-xs text-muted-foreground">Línea Auxiliar Valle Grande</p>
      </div>
    </Screen>
  )
}
