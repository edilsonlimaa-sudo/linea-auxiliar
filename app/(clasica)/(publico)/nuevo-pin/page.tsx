import { KeyRoundIcon } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BotonSalir } from "@/components/boton-salir"
import { FormularioNuevoPin } from "@/components/formulario/formulario-nuevo-pin"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { inicioDe, obtenerPerfil } from "@/lib/sesion"

export const metadata: Metadata = { title: "Escoge tu PIN · Línea Auxiliar" }

// R4: entró con el PIN temporal que le mandó el admin; antes de cualquier otra pantalla, escoge el suyo
export default async function PaginaNuevoPin() {
  const perfil = await obtenerPerfil()
  if (!perfil) redirect("/")
  if (perfil.rol === "admin") redirect("/admin")
  if (!perfil.debe_cambiar_clave) redirect(inicioDe(perfil))

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl leading-tight font-bold">Hola, {perfil.nombre.split(" ")[0]}</h1>
        <p className="mt-1 text-muted-foreground">Antes de seguir, escoge tu PIN.</p>
      </header>
      <Alert variant="warning">
        <KeyRoundIcon aria-hidden />
        <AlertTitle>Entraste con un PIN temporal</AlertTitle>
        <AlertDescription>Escoge uno nuevo que solo tú sepas. Desde ahora entras con ese.</AlertDescription>
      </Alert>
      <FormularioNuevoPin />
      <BotonSalir />
    </div>
  )
}
