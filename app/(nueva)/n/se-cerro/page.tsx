import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { Screen } from "@/components/nueva/app/screen"
import { SeCerro } from "@/components/nueva/pasajero/se-cerro"
import { CIERRE_VISTO } from "@/lib/cierre-visto"
import { cargarAvisoDeCierre, cargarInicioPasajero, cargarMotivoDeCierre } from "@/lib/datos/inicio-pasajero"
import { cargarListaGina } from "@/lib/datos/lista-gina"
import { CIERRE_PARA_EL_PASAJERO, type CerradoPor, esMotivoCancelar, MOTIVO_PARA_EL_PASAJERO } from "@/lib/motivos-cancelar"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { aceptaReservas, carrosHaciaValle, libres } from "@/lib/viajes"

export const metadata: Metadata = { title: "Tu viaje · Línea Auxiliar" }

// Pantalla de paso cuando otro cerró su reserva (R14, R21, R24, R29): qué pasó, por qué y qué hacer ahora. Sin pestañas
export default async function SeCerroPagina() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const [cierre, datos] = await Promise.all([cargarAvisoDeCierre(perfil.id), cargarInicioPasajero(perfil.id)])
  if (!cierre || datos.miReserva || (await cookies()).get(CIERRE_VISTO)?.value === cierre.reservaId) redirect("/n")

  // El porqué, si el chofer lo dijo (o si lo cerró la Línea o se desconectó)
  let porque: string | null = null
  if (cierre.motivo === "cancelo" || cierre.motivo === "cerrado") {
    const m = await cargarMotivoDeCierre(cierre.reservaId)
    const nombre = cierre.chofer.split(" ")[0]
    if (m?.motivo && esMotivoCancelar(m.motivo)) porque = MOTIVO_PARA_EL_PASAJERO[m.motivo]?.(nombre) ?? null
    else if (m && m.por in CIERRE_PARA_EL_PASAJERO) porque = CIERRE_PARA_EL_PASAJERO[m.por as CerradoPor]?.(nombre) ?? null
  }

  // Qué hacer ahora: cuántos carros de ese sentido tienen puesto
  const conPuesto =
    cierre.sentido === "vg_a_centro"
      ? datos.viajes.filter((v) => v.sentido === "vg_a_centro" && aceptaReservas(v) && libres(v) > 0).length
      : carrosHaciaValle(datos.viajes, datos.porId).filter((v) => libres(v) > 0).length
  const enLista = cierre.sentido === "centro_a_vg" ? (await cargarListaGina()).some((e) => e.esMio) : false

  return (
    <Screen>
      <SeCerro cierre={cierre} porque={porque} conPuesto={conPuesto} enLista={enLista} />
    </Screen>
  )
}
