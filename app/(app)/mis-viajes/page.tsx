import type { Metadata } from "next"

import { ViajesChofer } from "@/components/historial/viajes-chofer"
import { ViajesPasajero } from "@/components/historial/viajes-pasajero"
import { cargarViajesChofer, cargarViajesPasajero } from "@/lib/datos/historial"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Mis viajes · Línea Auxiliar" }

// Historial (docs/especificacion.md R50–R51): el chofer ve sus viajes terminados; el pasajero, los que viajó
export default async function PaginaMisViajes() {
  const perfil = await exigirCuentaAprobada()
  const esChofer = perfil.rol === "chofer"

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] leading-tight font-bold">Mis viajes</h1>
        <p className="text-muted-foreground">{esChofer ? "Tus últimos 20 viajes terminados." : "Los viajes que hiciste con la línea."}</p>
      </div>
      {esChofer ? (
        <ViajesChofer viajes={await cargarViajesChofer(perfil.id)} />
      ) : (
        <ViajesPasajero viajes={await cargarViajesPasajero(perfil.id)} />
      )}
    </div>
  )
}
