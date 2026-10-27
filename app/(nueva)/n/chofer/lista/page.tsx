import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ListaConAcciones } from "@/components/nueva/chofer/gina"
import { cargarCuotaChofer } from "@/lib/datos/cuota"
import { cargarInicioChofer } from "@/lib/datos/inicio-chofer"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { libres } from "@/lib/viajes"

export const metadata: Metadata = { title: "La lista en Gina · Línea Auxiliar" }

const personas = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)

/**
 * La lista hacia Valle Grande completa (§5.17, R63), en orden. En Gina, deja subir según el plan de su carro (R64); en
 * ruta hacia Valle Grande, ir por quien espera en el camino (R67). El teléfono, solo si está conectado (§6).
 */
export default async function ListaGina() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const [datos, cuota] = await Promise.all([cargarInicioChofer(perfil.id, perfil.conectado_en !== null), cargarCuotaChofer(perfil.id)])
  // R76: sin la cuota, la lista no es para él
  if (cuota && !cuota.habilitado && !datos.enRuta && !datos.recogida) redirect("/n/chofer")
  const { recogida, enRuta, listaTramo } = datos
  const enGina =
    recogida?.sentido === "centro_a_vg" && recogida.estado === "en_parada" ? { viajeId: recogida.id, plan: recogida.gina ?? [], libres: libres(recogida) } : null
  const haciaValle = enRuta?.sentido === "centro_a_vg" ? { viajeId: enRuta.id, libres: libres(enRuta) } : null
  const total = listaTramo.reduce((n, e) => n + e.personas, 0)

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="La lista en Gina" backHref="/n/chofer" />
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          {listaTramo.length === 0 ? "Nadie está esperando ahora." : `${personas(total)} por orden de llegada, hacia Valle Grande.`}
        </p>
        {enGina ? (
          <p className="rounded-2xl bg-primary/10 p-3 text-sm text-primary">
            <strong>Estás en Gina.</strong> Llama en orden y marca Subió a quien sube. A los de otro lugar se les guarda puesto.
          </p>
        ) : haciaValle ? (
          <p className="rounded-2xl bg-muted p-3 text-sm">
            Vas hacia Valle Grande con {personas(haciaValle.libres)} de espacio: toca <strong>Voy</strong> si pasas por alguien del camino.
          </p>
        ) : null}
        <ListaConAcciones lista={listaTramo} enGina={enGina} enRuta={haciaValle} />
      </div>
    </Screen>
  )
}
