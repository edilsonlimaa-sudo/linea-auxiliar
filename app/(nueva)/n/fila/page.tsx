import type { Metadata } from "next"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { FilaLista } from "@/components/nueva/pasajero/lista"
import { cargarListaGina } from "@/lib/datos/lista-gina"
import { filaVista } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"

export const metadata: Metadata = { title: "La lista en Gina · Línea Auxiliar" }

// La lista completa hacia Valle Grande (R63), la misma para todos, con la mía destacada
export default async function Fila() {
  await exigirCuentaAprobada({ interfaz: "nueva" })
  const lista = await cargarListaGina()
  const mia = lista.some((e) => e.esMio)

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="La lista en Gina" backHref={mia ? "/n" : "/n/a-valle-grande"} />
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">Parada Gina, Centro → Valle Grande. El orden es por la hora en que cada uno se anotó.</p>
        <FilaLista filas={lista.map(filaVista)} />
      </div>
    </Screen>
  )
}
