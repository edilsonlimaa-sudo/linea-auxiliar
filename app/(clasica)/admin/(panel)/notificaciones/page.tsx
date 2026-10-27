import type { Metadata } from "next"

import { NotificacionesEnviadas, NuevaNotificacion } from "@/components/admin/notificaciones"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { cargarEnLaNueva } from "@/lib/datos/interfaz"
import { cargarEnviadas } from "@/lib/datos/notificaciones"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Notificaciones · Administración · Línea Auxiliar" }

// Notificaciones (§5.23, R88): mandar a todos los pasajeros de la interfaz nueva o a algunos, y ver quién las vio
export default async function PaginaNotificaciones() {
  await exigirAdmin()
  const [personas, { enviadas, error }] = await Promise.all([cargarEnLaNueva("pasajero"), cargarEnviadas()])

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl leading-tight font-bold">Notificaciones</h1>
        <p className="text-muted-foreground">Avisos, consejos y novedades. Les llegan en la pestaña Notificaciones de la app.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <NuevaNotificacion personas={personas} />
        <section aria-labelledby="enviadas" className="flex flex-col gap-3">
          <h2 id="enviadas" className="text-base font-bold">
            Enviadas
          </h2>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>No pudimos cargarlas: {error}</AlertTitle>
            </Alert>
          ) : (
            <NotificacionesEnviadas enviadas={enviadas} />
          )}
        </section>
      </div>
    </div>
  )
}
