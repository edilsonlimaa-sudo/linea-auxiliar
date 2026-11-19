import type { Metadata } from "next"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { CalificacionesChofer } from "@/components/nueva/chofer/calificaciones"
import { Navegar, nombreDelTramo, NumerosDelMes, NumerosDelTramo, Periodos } from "@/components/nueva/chofer/numeros"
import { cargarCalificacionesChofer } from "@/lib/datos/historial"
import { cargarMes, cargarRango, hoyCaracas, lunesDe, otroDia, otroMes, type Periodo } from "@/lib/datos/numeros-chofer"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { ahoraDelPedido } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { ACTIVOS } from "@/lib/viajes"

export const metadata: Metadata = { title: "Mis números · Línea Auxiliar" }

const fechaValida = (d: unknown): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)

/**
 * Mis números (R118): el tablero de la app nativa (R111) en la web, y debajo sus calificaciones (R52). Hoy · Semana · Mes
 * con ‹ › para ir atrás (hasta el mes de su primer viaje) y adelante (hasta hoy). Solo sus números (R112).
 */
export default async function MisNumeros({ searchParams }: PageProps<"/n/chofer/numeros">) {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const { p, d } = await searchParams
  const periodo: Periodo = p === "semana" || p === "mes" ? p : "hoy"
  const hoy = hoyCaracas()
  const pedido = fechaValida(d) && d <= hoy ? d : hoy
  const supabase = await crearClienteServidor()

  // El mes actual da hasta dónde puede volver (el mes de su primer viaje)
  const [esteMes, calificaciones, abiertosRes] = await Promise.all([
    cargarMes(`${hoy.slice(0, 8)}01`),
    cargarCalificacionesChofer(perfil.id),
    supabase.from("viajes").select("id", { count: "exact", head: true }).eq("chofer_id", perfil.id).in("estado", ACTIVOS),
  ])
  const primerDia = esteMes?.primer_mes ?? `${hoy.slice(0, 8)}01`

  let contenido: React.ReactNode = null
  let antes: string | null = null
  let despues: string | null = null
  let nombre = ""

  if (periodo === "mes") {
    const mes = `${(pedido < primerDia ? primerDia : pedido).slice(0, 8)}01`
    const datos = mes === `${hoy.slice(0, 8)}01` ? esteMes : await cargarMes(mes)
    nombre = nombreDelTramo("mes", mes, hoy)
    antes = otroMes(mes, -1) >= primerDia.slice(0, 8) + "01" ? otroMes(mes, -1) : null
    despues = otroMes(mes, 1) <= hoy ? otroMes(mes, 1) : null
    contenido = datos ? <NumerosDelMes datos={datos} /> : null
  } else {
    const desde = periodo === "hoy" ? (pedido < primerDia ? primerDia : pedido) : lunesDe(pedido < primerDia ? primerDia : pedido)
    const hasta = periodo === "hoy" ? desde : otroDia(desde, 6) > hoy ? hoy : otroDia(desde, 6)
    const datos = await cargarRango(desde, hasta)
    const paso = periodo === "hoy" ? 1 : 7
    nombre = nombreDelTramo(periodo, desde, hoy)
    antes = otroDia(desde, paso === 1 ? -1 : -7) >= (periodo === "hoy" ? primerDia : lunesDe(primerDia)) ? otroDia(desde, -paso) : null
    despues = otroDia(desde, paso) <= hoy ? otroDia(desde, paso) : null
    contenido = datos ? <NumerosDelTramo datos={datos} periodo={periodo} hoy={hoy} ahora={ahoraDelPedido()} abiertos={abiertosRes.count ?? 0} /> : null
  }

  return (
    <Screen>
      <AppHeader title="Mis números" />
      <div className="flex flex-col gap-4 p-4">
        <Periodos actual={periodo} />
        <Navegar periodo={periodo} nombre={nombre} antes={antes} despues={despues} />
        {contenido ?? <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">No pudimos cargar tus números. Intenta de nuevo.</p>}
        <p className="text-center text-xs text-muted-foreground">Lo cobrado es un estimado: pasajeros por la tarifa, menos viajes gratis y aportes.</p>
        <CalificacionesChofer r={calificaciones} />
      </div>
    </Screen>
  )
}
