import { CarFront, ChevronRight, UserRound } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"

export const metadata: Metadata = { title: "Crear cuenta · Línea Auxiliar" }

// Crear cuenta, paso 1 (docs/especificacion.md §8): recién aquí se pregunta cómo va a usar la app
export default function PaginaEscogerRol() {
  return (
    <Screen>
      <AppHeader title="Crear una cuenta" backHref="/" />
      <div className="flex flex-col gap-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="font-heading text-2xl font-semibold">¿Cómo vas a usar la app?</p>
        <nav aria-label="Tipo de cuenta" className="flex flex-col gap-3">
          <OpcionRol href="/registro/pasajero" icono={<UserRound className="size-6" />} titulo="Soy pasajero" detalle="Ver los carros y apartar mi puesto" />
          <OpcionRol href="/registro/chofer" icono={<CarFront className="size-6" />} titulo="Soy chofer" detalle="Publicar mi salida y ordenar mis puestos" />
        </nav>
        <p className="mt-2 text-center">
          ¿Ya tienes cuenta?{" "}
          <Link href="/" className="font-medium text-primary underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </Screen>
  )
}

function OpcionRol({ href, icono, titulo, detalle }: { href: string; icono: React.ReactNode; titulo: string; detalle: string }) {
  return (
    <Link
      href={href}
      transitionTypes={["nav-forward"]}
      className="flex items-center gap-4 rounded-3xl border bg-card p-4 shadow-(--sombra-card) outline-none active:scale-[0.99] focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-lg leading-tight font-semibold">{titulo}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{detalle}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  )
}
