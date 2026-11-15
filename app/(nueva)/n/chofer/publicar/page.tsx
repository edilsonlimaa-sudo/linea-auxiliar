import type { Metadata } from "next"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { type ModoPublicar, PublicarFormulario } from "@/components/nueva/chofer/publicar"
import { cargarInicioChofer } from "@/lib/datos/inicio-chofer"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "Publicar un viaje · Línea Auxiliar" }

// Publicar un viaje (R10) o agregar otro a la cadena (R11). El modo sale de sus viajes abiertos, no de la dirección
export default async function Publicar() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const datos = await cargarInicioChofer(perfil.id, perfil.conectado_en !== null)
  const { enRuta, recogida, proximos, ultimo } = datos
  const modo: ModoPublicar = recogida ? "cadena" : enRuta ? "desde_ruta" : "primero"
  // Los puestos sugeridos: los del último de la cadena, o los del último viaje
  const finDeCadena = [enRuta, recogida, ...proximos].filter((v) => v !== null).at(-1)

  return (
    <Screen>
      <AppHeader title={modo === "primero" ? "Publicar un viaje" : "Agregar otro viaje"} backHref="/n/chofer" />
      <div className="flex flex-1 flex-col gap-4 p-4 pb-0">
        <PublicarFormulario modo={modo} puestosIniciales={finDeCadena?.puestos ?? ultimo?.puestos ?? 4} />
      </div>
    </Screen>
  )
}
