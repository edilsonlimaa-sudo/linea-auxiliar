import type { Metadata } from "next"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { AvisosCelular } from "@/components/nueva/pasajero/avisos-celular"
import { ListaNotificaciones } from "@/components/nueva/pasajero/notificaciones"
import { cargarMisNotificaciones } from "@/lib/datos/notificaciones"
import { ahoraDelPedido, notificacionVista } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Notificaciones · Línea Auxiliar" }

// Notificaciones (R89): lo que manda el admin, la más nueva primero; al verlas quedan leídas. Arriba, activar los
// avisos en el celular (R90)
export default async function Notificaciones() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const ahora = ahoraDelPedido()
  const items = (await cargarMisNotificaciones(perfil.id)).map((n) => notificacionVista(n, ahora))

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="Notificaciones" />
      <div className="flex flex-col gap-4 p-4">
        <AvisosCelular />
        <ListaNotificaciones items={items} />
      </div>
    </Screen>
  )
}
