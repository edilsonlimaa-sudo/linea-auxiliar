import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FormularioRegistro } from "@/components/nueva/acceso/formularios"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"

const ROLES = {
  pasajero: { titulo: "Cuenta de pasajero", puede: "apartar puesto" },
  chofer: { titulo: "Cuenta de chofer", puede: "publicar viajes" },
} as const

type Rol = keyof typeof ROLES

export const metadata: Metadata = { title: "Crear cuenta · Línea Auxiliar" }

export default async function PaginaRegistro({ params }: { params: Promise<{ rol: string }> }) {
  const { rol } = await params
  if (!(rol in ROLES)) notFound()
  const r = rol as Rol

  return (
    <Screen>
      <AppHeader title={ROLES[r].titulo} backHref="/registro" />
      <div className="flex flex-col gap-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="text-muted-foreground">
          Toma menos de un minuto. El administrador revisará tus datos antes de que puedas {ROLES[r].puede}.
        </p>
        <FormularioRegistro rol={r} />
        <p className="text-center">
          ¿Ya tienes cuenta?{" "}
          <Link href="/" className="font-medium text-primary underline underline-offset-4">
            Entrar
          </Link>
        </p>
      </div>
    </Screen>
  )
}
