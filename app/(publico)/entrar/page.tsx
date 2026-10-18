import { ChevronLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { FormularioEntrar } from "@/components/formulario/formulario-entrar"

export const metadata: Metadata = { title: "Entrar · Línea Auxiliar" }

export default function PaginaEntrar() {
  return (
    <div className="flex flex-col gap-5">
      <Link href="/" className="-ml-1 inline-flex w-fit items-center gap-1 py-2 text-lg font-bold text-primary dark:text-foreground">
        <ChevronLeftIcon aria-hidden className="size-6" /> Atrás
      </Link>
      <header>
        <h1 className="text-[26px] leading-tight font-bold">Entrar</h1>
        <p className="mt-1 text-muted-foreground">Con tu número de celular y tu PIN.</p>
      </header>
      <FormularioEntrar />
      <p className="text-center text-muted-foreground">
        ¿Olvidaste tu PIN? Pídele al administrador de la línea un PIN nuevo.
      </p>
      <p className="text-center">
        ¿No tienes cuenta?{" "}
        <Link href="/" className="font-bold text-primary underline underline-offset-4 dark:text-foreground">
          Crear una
        </Link>
      </p>
    </div>
  )
}
