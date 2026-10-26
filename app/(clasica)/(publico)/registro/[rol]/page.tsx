import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FormularioRegistro } from "@/components/formulario/formulario-registro"

const ROLES = {
  pasajero: { titulo: "Crear cuenta de pasajero" },
  chofer: { titulo: "Crear cuenta de chofer" },
} as const

type Rol = keyof typeof ROLES

export const metadata: Metadata = { title: "Crear cuenta · Línea Auxiliar" }

export default async function PaginaRegistro({ params }: { params: Promise<{ rol: string }> }) {
  const { rol } = await params
  if (!(rol in ROLES)) notFound()
  const r = rol as Rol

  return (
    <div className="flex flex-col gap-4">
      <Link href="/registro" className="-ml-1 inline-flex w-fit items-center gap-1 py-2 text-base font-bold text-primary dark:text-foreground">
        <ChevronLeftIcon aria-hidden className="size-6" /> Atrás
      </Link>
      <header>
        <h1 className="text-xl leading-tight font-bold">{ROLES[r].titulo}</h1>
        <p className="mt-1 text-muted-foreground">
          Toma menos de un minuto. El administrador revisará tus datos antes de que puedas{" "}
          {r === "chofer" ? "publicar viajes" : "apartar puesto"}.
        </p>
      </header>
      <FormularioRegistro rol={r} />
      <p className="text-center">
        ¿Ya tienes cuenta?{" "}
        <Link href="/" className="font-bold text-primary underline underline-offset-4 dark:text-foreground">
          Entrar
        </Link>
      </p>
    </div>
  )
}
