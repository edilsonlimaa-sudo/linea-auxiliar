import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ChipTarifa } from "@/components/nueva/pasajero/avisos"
import { AvisosCelular } from "@/components/nueva/pasajero/avisos-celular"
import { AvisoCard } from "@/components/nueva/pasajero/comunes"
import { DirectionPicker } from "@/components/nueva/pasajero/direction-picker"
import { SeguirInstagramHoja } from "@/components/nueva/pasajero/instagram"
import { LineaAhora } from "@/components/nueva/pasajero/linea-ahora"
import { ArbolitoCard } from "@/components/nueva/pasajero/navidad"
import { MiViaje } from "@/components/nueva/pasajero/mi-viaje"
import { ChipViajesGratis } from "@/components/nueva/pasajero/viaje-gratis"
import { cargarAvisoDeCierre, cargarCalificacionPendiente, cargarInicioPasajero, cargarPagoMovilDe } from "@/lib/datos/inicio-pasajero"
import { cargarListaGina } from "@/lib/datos/lista-gina"
import { contarEsferas } from "@/lib/datos/navidad"
import { misViajesGratis } from "@/lib/datos/viajes-gratis"
import { ahoraDelPedido, miListaVista, miViajeVista, servicioVista } from "@/lib/nueva/vistas"
import { CIERRE_VISTO } from "@/lib/cierre-visto"
import { COOKIE_INSTAGRAM, PARAM_SEGUIR } from "@/lib/instagram"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { temporadaNavidad } from "@/lib/temporada"
import { aceptaReservas, ordenarParaPasajero } from "@/lib/viajes"

export const metadata: Metadata = { title: "Línea Auxiliar" }

/**
 * Inicio de la interfaz nueva (§5.21, §8). Con reserva o anotado en la lista hacia Valle Grande, la misma dirección es
 * Mi viaje; si no, "¿Hacia dónde vas?" con el viaje recién terminado arriba (calificar), los avisos y la línea.
 */
export default async function InicioNueva({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const ahora = ahoraDelPedido()
  const datos = await cargarInicioPasajero(perfil.id)

  if (datos.miReserva) {
    // El Pago Móvil solo a bordo (R74 en la nueva)
    const [pago, gratis] = await Promise.all([
      datos.miReserva.reserva.estado === "subio" ? cargarPagoMovilDe(datos.miReserva.viaje.chofer_id) : null,
      misViajesGratis(), // R103
    ])
    return (
      <Screen>
        <EnVivo />
        <MiViaje viaje={miViajeVista(datos.miReserva, datos.porId, pago, ahora, gratis)} />
      </Screen>
    )
  }

  const temporada = temporadaNavidad(new Date(), perfil.de_prueba)
  const [pendiente, cierre, lista, esferas, gratis] = await Promise.all([
    cargarCalificacionPendiente(perfil.id),
    cargarAvisoDeCierre(perfil.id),
    cargarListaGina(),
    temporada ? contarEsferas(perfil.id) : 0,
    misViajesGratis(),
  ])
  // Recién terminó un viaje sin calificar (R45): primero la pantalla de paso "Llegaste bien"
  if (pendiente) redirect("/n/llegaste")
  // Otro cerró su reserva (canceló, salió lleno…) y no lo ha visto: primero la pantalla que explica qué pasó
  if (cierre && (await cookies()).get(CIERRE_VISTO)?.value !== cierre.reservaId) redirect("/n/se-cerro")
  // Anotado en la lista no es todavía un viaje (§5.17): su lugar vive en A Valle Grande; Mi viaje empieza al montarse
  const mio = miListaVista(lista)

  const ofrecerInstagram = Boolean((await searchParams)[PARAM_SEGUIR]) && !(await cookies()).has(COOKIE_INSTAGRAM)

  const alCentro = ordenarParaPasajero(datos.viajes.filter((v) => v.sentido === "vg_a_centro" && aceptaReservas(v)), datos.porId).length
  const enGina = lista.reduce((n, e) => n + e.personas, 0)

  return (
    <Screen>
      <EnVivo />
      <AppHeader title={`Hola, ${perfil.nombre.split(" ")[0]}`} />
      {/* R95: tras calificar con 4–5 estrellas (?seguir=1), una vez por teléfono */}
      <SeguirInstagramHoja ofrecer={ofrecerInstagram} />
      <div className="flex flex-col gap-6 p-4">
        {/* §8: la pregunta primero. Encima, solo lo que pide actuar ya (el aviso del admin); nada nuevo entra arriba */}
        {datos.aviso ? <AvisoCard texto={datos.aviso.texto} /> : null}
        <DirectionPicker
          alCentro={alCentro}
          enGina={enGina}
          miLugar={mio?.posicion ?? null}
          contexto={
            <>
              {/* R80: la tarifa especial; R103: los viajes gratis que le regalaron */}
              <ChipTarifa />
              {gratis > 0 ? <ChipViajesGratis cuantos={gratis} /> : null}
            </>
          }
        />
        {/* R100: la temporada navideña */}
        {temporada ? <ArbolitoCard temporada={temporada} esferas={esferas} /> : null}
        <LineaAhora choferes={datos.enServicio.map(servicioVista)} />
        {/* R90: el recordatorio de los avisos en el celular, al final */}
        <AvisosCelular recordatorio />
      </div>
    </Screen>
  )
}
