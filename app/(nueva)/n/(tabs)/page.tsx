import type { Metadata } from "next"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { AvisoCierre, AvisoTarifa } from "@/components/nueva/pasajero/avisos"
import { AvisosCelular } from "@/components/nueva/pasajero/avisos-celular"
import { AvisoCard } from "@/components/nueva/pasajero/comunes"
import { DirectionPicker } from "@/components/nueva/pasajero/direction-picker"
import { LineaAhora } from "@/components/nueva/pasajero/linea-ahora"
import { PantallaValle } from "@/components/nueva/pasajero/lista"
import { MiViaje } from "@/components/nueva/pasajero/mi-viaje"
import { ViajeTerminado } from "@/components/nueva/pasajero/viaje-terminado"
import { cargarAvisoDeCierre, cargarCalificacionPendiente, cargarInicioPasajero, cargarPagoMovilDe } from "@/lib/datos/inicio-pasajero"
import { cargarListaGina } from "@/lib/datos/lista-gina"
import { ahoraDelPedido, filaVista, miListaVista, miViajeVista, servicioVista, unidadVista } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { aceptaReservas, carrosHaciaValle, ordenarParaPasajero } from "@/lib/viajes"

export const metadata: Metadata = { title: "Línea Auxiliar" }

/**
 * Inicio de la interfaz nueva (§5.21, §8). Con reserva o anotado en la lista hacia Valle Grande, la misma dirección es
 * Mi viaje; si no, "¿Hacia dónde vas?" con el viaje recién terminado arriba (calificar), los avisos y la línea.
 */
export default async function InicioNueva() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const ahora = ahoraDelPedido()
  const datos = await cargarInicioPasajero(perfil.id)

  if (datos.miReserva) {
    // El Pago Móvil solo a bordo (R74 en la nueva)
    const pago = datos.miReserva.reserva.estado === "subio" ? await cargarPagoMovilDe(datos.miReserva.viaje.chofer_id) : null
    return (
      <Screen>
        <EnVivo />
        <MiViaje viaje={miViajeVista(datos.miReserva, datos.porId, pago, ahora)} />
      </Screen>
    )
  }

  const [pendiente, cierre, lista] = await Promise.all([
    cargarCalificacionPendiente(perfil.id),
    cargarAvisoDeCierre(perfil.id),
    cargarListaGina(),
  ])
  const mio = miListaVista(lista)
  if (mio) {
    const carros = carrosHaciaValle(datos.viajes, datos.porId).map((v) => unidadVista(v, datos.porId, ahora))
    return (
      <Screen>
        <EnVivo />
        <PantallaValle mio={mio} filas={lista.map(filaVista)} carros={carros} titulo="Mi viaje" />
      </Screen>
    )
  }

  const alCentro = ordenarParaPasajero(datos.viajes.filter((v) => v.sentido === "vg_a_centro" && aceptaReservas(v)), datos.porId).length
  const enGina = lista.reduce((n, e) => n + e.personas, 0)

  return (
    <Screen>
      <EnVivo />
      <AppHeader title={`Hola, ${perfil.nombre.split(" ")[0]}`} />
      <div className="flex flex-col gap-6 p-4">
        <AvisosCelular recordatorio />
        {pendiente ? <ViajeTerminado viaje={pendiente} /> : null}
        {cierre ? <AvisoCierre aviso={cierre} /> : null}
        {datos.aviso ? <AvisoCard texto={datos.aviso.texto} /> : null}
        <AvisoTarifa />
        <DirectionPicker alCentro={alCentro} enGina={enGina} />
        <LineaAhora choferes={datos.enServicio.map(servicioVista)} />
      </div>
    </Screen>
  )
}
