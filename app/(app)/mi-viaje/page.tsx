import { ArrowRightLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { EnVivo } from "@/components/en-vivo"
import { CalificarViaje } from "@/components/pasajero/calificar-viaje"
import { EstadoLinea } from "@/components/pasajero/estado-linea"
import { MiReservaTarjeta } from "@/components/pasajero/mi-reserva"
import { buttonVariants } from "@/components/ui/button"
import { cargarCalificacionPendiente, cargarInicioPasajero } from "@/lib/datos/inicio-pasajero"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { otrasConPuesto, tienePuesto } from "@/lib/viajes"

export const metadata: Metadata = { title: "Mi viaje · Línea Auxiliar" }

/**
 * Mi viaje del pasajero (docs/especificacion.md §8): del momento de apartar hasta calificar.
 * Esperando el carro o a bordo → la tarjeta del viaje; terminado → "¿Cómo te fue?"; si no, vuelve a Inicio.
 */
export default async function PaginaMiViaje() {
  const perfil = await exigirCuentaAprobada()
  if (perfil.rol !== "pasajero") redirect("/inicio")

  const { miReserva, viajes, porId, aviso, lugaresRecientes } = await cargarInicioPasajero(perfil.id)
  if (!miReserva) {
    const pendiente = await cargarCalificacionPendiente(perfil.id)
    if (!pendiente) redirect("/inicio")
    return <CalificarViaje pendiente={pendiente} />
  }

  const aBordo = miReserva.reserva.estado === "subio"
  const otras = aBordo || tienePuesto(miReserva.posicion, miReserva.viaje) ? [] : otrasConPuesto(viajes, miReserva.viaje, porId)

  return (
    <div className="flex flex-col gap-5">
      {/* A bordo también se refresca: así, al terminar el viaje, aparece la calificación */}
      <EnVivo />
      <h1 className="sr-only">Mi viaje</h1>
      {/* Aquí solo importa el aviso del día; los choferes trabajando ya no hacen falta */}
      {aviso && <EstadoLinea aviso={aviso} />}

      <MiReservaTarjeta
        datos={miReserva}
        porId={porId}
        recientes={lugaresRecientes}
        cambiarme={
          otras.length > 0 && (
            <Link href="/inicio?cambiar=1" className={buttonVariants({ className: "w-full" })}>
              <ArrowRightLeftIcon aria-hidden />
              {otras.length === 1 ? "Ver 1 unidad con puesto" : `Ver ${otras.length} unidades con puesto`}
            </Link>
          )
        }
      />
    </div>
  )
}
