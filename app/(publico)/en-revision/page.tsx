import { ClockIcon, XCircleIcon } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BotonSalir } from "@/components/boton-salir"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { obtenerPerfil } from "@/lib/sesion"

export const metadata: Metadata = { title: "Cuenta en revisión · Línea Auxiliar" }

// Cuenta pendiente o rechazada (R2): puede entrar, pero aún no usar la app
export default async function PaginaEnRevision() {
  const perfil = await obtenerPerfil()
  if (!perfil) redirect("/entrar")
  if (perfil.estado === "aprobado") redirect("/inicio")

  const nombre = perfil.nombre.split(" ")[0]
  const rechazada = perfil.estado === "rechazado"

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px] leading-tight font-bold">Hola, {nombre}</h1>

      {rechazada ? (
        <Alert variant="destructive">
          <XCircleIcon aria-hidden />
          <AlertTitle>Tu cuenta no fue aprobada</AlertTitle>
          <AlertDescription>
            Comunícate con la administración de la línea para saber qué falta.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="warning">
          <ClockIcon aria-hidden />
          <AlertTitle>Tu cuenta está en revisión</AlertTitle>
          <AlertDescription>
            El administrador de la línea va a revisar tus datos. Cuando te apruebe podrás{" "}
            {perfil.rol === "chofer" ? "publicar tus viajes" : "apartar puesto en las unidades"}. Puede tomar
            unas horas.
          </AlertDescription>
        </Alert>
      )}

      {!rechazada && (
        <section className="rounded-lg border-2 bg-card p-4">
          <h2 className="text-lg font-bold">Mientras tanto</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
            <li>Guarda bien tu PIN: lo necesitas para entrar.</li>
            <li>Si conoces al administrador, avísale por WhatsApp que ya te registraste.</li>
          </ul>
        </section>
      )}

      {/* Volver a cargar esta página revisa de nuevo el estado de la cuenta */}
      <Button render={<a href="/en-revision" />} nativeButton={false} size="lg" variant="secondary">
        Revisar de nuevo
      </Button>
      <BotonSalir />
    </div>
  )
}
