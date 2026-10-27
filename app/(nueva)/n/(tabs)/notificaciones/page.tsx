import type { Metadata } from "next"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ListaNotificaciones } from "@/components/nueva/pasajero/notificaciones"
import { cargarMisNotificaciones } from "@/lib/datos/notificaciones"
import { ahoraDelPedido, notificacionVista } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Notificaciones · Línea Auxiliar" }

// Notificaciones (R89): lo que manda el admin, la más nueva primero; al verlas quedan leídas
export default async function Notificaciones() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const ahora = ahoraDelPedido()
  const items = (await cargarMisNotificaciones(perfil.id)).map((n) => notificacionVista(n, ahora))

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="Notificaciones" />
      <div className="p-4">
        <ListaNotificaciones items={items} />
      </div>
    </Screen>
  )
}
