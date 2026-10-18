import { ChevronLeftIcon, ShieldAlertIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { FormularioCambiarClave } from "@/components/admin/formularios-admin"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Cambiar contraseña · Línea Auxiliar" }

export default async function PaginaClaveAdmin() {
  const perfil = await exigirAdmin({ permitirClaveTemporal: true })
  const obligatoria = perfil.debe_cambiar_clave

  return (
    <div className="flex flex-col gap-5">
      {!obligatoria && (
        <Link href="/admin" className="-ml-1 inline-flex w-fit items-center gap-1 py-2 text-lg font-bold text-primary dark:text-foreground">
          <ChevronLeftIcon aria-hidden className="size-6" /> Volver al panel
        </Link>
      )}
      <h1 className="text-[26px] leading-tight font-bold">Cambiar contraseña</h1>
      {obligatoria && (
        <Alert variant="warning">
          <ShieldAlertIcon aria-hidden />
          <AlertTitle>Primero cambia la contraseña por defecto</AlertTitle>
          <AlertDescription>
            Por seguridad, el panel se abre después de que elijas una contraseña propia.
          </AlertDescription>
        </Alert>
      )}
      <FormularioCambiarClave />
    </div>
  )
}
