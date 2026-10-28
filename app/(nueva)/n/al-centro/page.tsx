import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { AvisoAlCentro } from "@/components/nueva/pasajero/aviso-al-centro"
import { UnidadCard } from "@/components/nueva/pasajero/unidad-card"
import { cargarInicioPasajero } from "@/lib/datos/inicio-pasajero"
import { hora } from "@/lib/fechas"
import { ahoraDelPedido, unidadVista } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { aceptaReservas, libres, ordenarParaPasajero } from "@/lib/viajes"

export const metadata: Metadata = { title: "Al Centro · Línea Auxiliar" }

// Al Centro (§8, R16): las unidades que aceptan reservas, la que recoge primero con puesto destacada. Sin carro con
// puesto, "Avisarme cuando haya un carro" (R94)
export default async function AlCentro() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const datos = await cargarInicioPasajero(perfil.id)
  // Con un viaje en curso, su lugar es Mi viaje
  if (datos.miReserva) redirect("/n")
  const ahora = ahoraDelPedido()
  const unidades = ordenarParaPasajero(datos.viajes.filter((v) => v.sentido === "vg_a_centro" && aceptaReservas(v)), datos.porId)
  const primera = unidades.find((v) => libres(v) > 0 && v.estado !== "en_ruta")
  const conPuesto = unidades.some((v) => libres(v) > 0)
  const espera = datos.miEspera?.sentido === "vg_a_centro" && datos.miEspera.vence_en ? datos.miEspera : null
  const pedido = espera ? { hasta: hora(espera.vence_en!), avisada: espera.avisado_en !== null } : null

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="Al Centro" backHref="/n" />
      <div className="flex flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div>
          <p className="text-sm text-muted-foreground">Valle Grande → Centro</p>
          <h2 className="font-heading text-2xl font-semibold">{unidades.length === 0 ? "Nadie en camino" : "Carros que vienen"}</h2>
        </div>
        {conPuesto ? null : <AvisoAlCentro pedido={pedido} />}
        {unidades.length === 0 ? (
          <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Ningún chofer va al Centro ahora. Esta pantalla se actualiza sola.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {unidades.map((v) => (
              <li key={v.id}>
                <UnidadCard unidad={unidadVista(v, datos.porId, ahora)} destacada={v.id === primera?.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Screen>
  )
}
