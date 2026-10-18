import { ShieldCheckIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { FormularioEntrarAdmin } from "@/components/admin/formularios-admin"

export const metadata: Metadata = { title: "Administración · Línea Auxiliar" }

// Entrada solo para la administración (usuario + contraseña). Choferes y pasajeros no tienen acceso.
export default function PaginaEntrarAdmin() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <span aria-hidden className="grid size-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <ShieldCheckIcon className="size-8" />
        </span>
        <h1 className="text-[26px] leading-tight font-bold">Administración</h1>
        <p className="text-muted-foreground">Acceso solo para la administración de la línea.</p>
      </header>
      <FormularioEntrarAdmin />
      <p className="text-center text-muted-foreground">
        ¿Eres chofer o pasajero?{" "}
        <Link href="/entrar" className="font-bold text-primary underline underline-offset-4 dark:text-foreground">
          Entra aquí
        </Link>
      </p>
    </div>
  )
}
