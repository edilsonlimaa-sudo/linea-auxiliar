import { CheckCircle2Icon, KeyRoundIcon, LogOutIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { NavAdmin } from "@/components/admin/nav-admin"
import { Resumen } from "@/components/admin/resumen"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { salirAdmin } from "@/lib/acciones/admin"
import { cargarCuentas, cargarResumen, pendientesPorRol } from "@/lib/datos/admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Administración · Línea Auxiliar" }

// Resumen del panel (§8): qué necesita del admin y cómo va la línea
export default async function PanelAdmin({ searchParams }: PageProps<"/admin">) {
  await exigirAdmin()
  const { clave } = await searchParams
  const [{ cuentas }, resumen] = await Promise.all([cargarCuentas(), cargarResumen()])
  const pendientes = pendientesPorRol(cuentas)

  return (
    <div className="flex flex-col gap-5">
      <NavAdmin activa="resumen" pendientes={pendientes} />
      <h1 className="text-[26px] leading-tight font-bold">Panel de administración</h1>

      {clave === "cambiada" && (
        <Alert variant="success">
          <CheckCircle2Icon aria-hidden />
          <AlertTitle>Contraseña cambiada</AlertTitle>
        </Alert>
      )}

      <Resumen cuentas={cuentas} resumen={resumen} pendientes={pendientes} />

      <div className="mt-4 flex flex-col gap-3 border-t-2 pt-5">
        <Button render={<Link href="/admin/clave" />} nativeButton={false} variant="outline">
          <KeyRoundIcon aria-hidden /> Cambiar mi contraseña
        </Button>
        <form action={salirAdmin}>
          <Button type="submit" variant="outline" className="w-full">
            <LogOutIcon aria-hidden /> Salir del panel
          </Button>
        </form>
      </div>
    </div>
  )
}
