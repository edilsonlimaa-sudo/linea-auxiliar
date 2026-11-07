import { KeyRound } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BotonSalir, FormularioNuevoPin } from "@/components/nueva/acceso/formularios"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { inicioDe, obtenerPerfil } from "@/lib/sesion"

export const metadata: Metadata = { title: "Escoge tu PIN · Línea Auxiliar" }

// R4: entró con el PIN temporal que le mandó el admin; antes de cualquier otra pantalla, escoge el suyo
export default async function PaginaNuevoPin() {
  const perfil = await obtenerPerfil()
  if (!perfil) redirect("/")
  if (perfil.rol === "admin") redirect("/admin")
  if (!perfil.debe_cambiar_clave) redirect(inicioDe(perfil))

  return (
    <Screen>
      <AppHeader title="Escoge tu PIN" />
      <div className="flex flex-col gap-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="font-heading text-2xl font-semibold">Hola, {perfil.nombre.split(" ")[0]}</p>
        <div className="flex items-start gap-3 rounded-3xl bg-secondary p-4 text-secondary-foreground">
          <KeyRound aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Entraste con un PIN temporal</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Escoge uno nuevo que solo tú sepas. Desde ahora entras con ese.</p>
          </div>
        </div>
        <section className="rounded-3xl border bg-card p-5 shadow-(--sombra-card)">
          <FormularioNuevoPin />
        </section>
        <BotonSalir />
      </div>
    </Screen>
  )
}
