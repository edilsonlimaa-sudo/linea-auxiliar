import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { EnVivo } from "@/components/en-vivo"
import { Screen } from "@/components/nueva/app/screen"
import { PantallaValle } from "@/components/nueva/pasajero/lista"
import { cargarInicioPasajero } from "@/lib/datos/inicio-pasajero"
import { cargarListaGina } from "@/lib/datos/lista-gina"
import { ahoraDelPedido, filaVista, miListaVista, unidadVista } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { carrosHaciaValle } from "@/lib/viajes"

export const metadata: Metadata = { title: "A Valle Grande · Línea Auxiliar" }

// A Valle Grande (§5.17): no se aparta, se anota en la lista en Gina. Una sola pantalla, anotado o no (PantallaValle)
export default async function AValleGrande() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const [datos, lista] = await Promise.all([cargarInicioPasajero(perfil.id), cargarListaGina()])
  // Con una reserva en curso, su lugar es Mi viaje
  if (datos.miReserva) redirect("/n")
  const ahora = ahoraDelPedido()
  const carros = carrosHaciaValle(datos.viajes, datos.porId).map((v) => unidadVista(v, datos.porId, ahora))

  return (
    <Screen>
      <EnVivo />
      <PantallaValle mio={miListaVista(lista)} filas={lista.map(filaVista)} carros={carros} titulo="A Valle Grande" backHref="/n" />
    </Screen>
  )
}
