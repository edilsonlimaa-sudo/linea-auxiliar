import { CirclePlus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { AccionRecogida, TerminarViaje } from "@/components/nueva/chofer/accion"
import { FranjaCompaneros } from "@/components/nueva/chofer/companeros"
import { EstadoEnCabecera, Ubicacion } from "@/components/nueva/chofer/conexion"
import { CuotaAviso } from "@/components/nueva/chofer/cuota"
import { DespuesTarjeta, PreguntaDespues, type Respuesta } from "@/components/nueva/chofer/despues"
import { FaixaLista } from "@/components/nueva/chofer/gina"
import { Proximos } from "@/components/nueva/chofer/siguiente"
import { type Resumen, ViajeTerminadoHoja } from "@/components/nueva/chofer/terminado"
import { TarjetaEnRuta, TarjetaViaje } from "@/components/nueva/chofer/viaje"
import { Button } from "@/components/nueva/ui/button"
import { cargarCuotaChofer } from "@/lib/datos/cuota"
import { cargarViajesChofer } from "@/lib/datos/historial"
import { cargarInicioChofer } from "@/lib/datos/inicio-chofer"
import { ahoraDelPedido } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { duracion, estadoParaChofer, libres, SENTIDOS, sumaPersonas, type Viaje } from "@/lib/viajes"

export const metadata: Metadata = { title: "Línea Auxiliar" }

const RESPUESTAS: Respuesta[] = ["vuelta", "pausa", "ultimo"]

/**
 * Inicio del chofer en la interfaz nueva (§5.21, §8). Sin viajes: "¿Sales a trabajar?" (o la cuota del día, R76). Con
 * viajes: el viaje en ruta arriba (R75), el que está recogiendo con su acción pegada abajo, los próximos y la lista de
 * Gina. Las reglas son las de la clásica (components/chofer/inicio-chofer.tsx).
 */
export default async function InicioChofer({ searchParams }: PageProps<"/n/chofer">) {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const conectado = perfil.conectado_en !== null
  const [datos, cuota, { despues, r, terminado }] = await Promise.all([cargarInicioChofer(perfil.id, conectado), cargarCuotaChofer(perfil.id), searchParams])
  const logro = typeof terminado === "string" ? await resumenDe(perfil.id, terminado) : null
  const ahora = ahoraDelPedido()
  const sinCuota = cuota !== null && !cuota.habilitado
  const { enRuta, recogida, proximos, listaTramo, vehiculo } = datos
  const abiertos = [enRuta, recogida, ...proximos].filter((v) => v !== null)
  const porId = new Map<string, Viaje>(abiertos.map((v) => [v.id, v]))
  const publicados = [recogida, ...proximos].filter((v) => v !== null).length
  const nombre = perfil.nombre.split(" ")[0]
  const hoja = logro ? <ViajeTerminadoHoja resumen={logro} /> : null
  const cabecera = <AppHeader title={`Hola, ${nombre}`} action={<EstadoEnCabecera conectado={conectado} sinCuota={sinCuota} viajesAbiertos={publicados} />} />

  // Sin viajes abiertos: "¿salgo ahora?"
  if (abiertos.length === 0) {
    return (
      <Screen>
        <EnVivo />
        {cabecera}
        <div className="flex flex-1 flex-col gap-4 p-4">
          {cuota && sinCuota ? <CuotaAviso cuota={cuota} /> : null}
          {!sinCuota ? (
            <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
              <div>
                <h2 className="font-heading text-2xl font-semibold">¿Sales a trabajar?</h2>
                <p className="text-sm text-muted-foreground">
                  {conectado ? "Estás conectado: los pasajeros te ven disponible." : "Publicar un viaje te conecta y te muestra a los pasajeros."}
                </p>
              </div>
              <Button size="lg" render={<Link href="/n/chofer/publicar?modo=primero" transitionTypes={["nav-forward"]} />} nativeButton={false}>
                <CirclePlus className="size-5" />
                Publicar un viaje
              </Button>
            </section>
          ) : null}
          {cuota && !sinCuota ? <CuotaAviso cuota={cuota} /> : null}
          {/* R76: sin la cuota, la lista de Gina no es para él */}
          {!sinCuota ? <FaixaLista lista={listaTramo} /> : null}
          <FranjaCompaneros companeros={datos.companeros} />
        </div>
        {hoja}
      </Screen>
    )
  }

  const texto = (v: Viaje) => estadoParaChofer(v, porId, ahora)
  // En ruta hacia Valle Grande: quien espera en el camino sin carro y cabe (R67)
  const esperanEnCamino =
    enRuta?.sentido === "centro_a_vg" ? listaTramo.filter((e) => !e.enGina && !e.diceQueSubio && e.personas <= libres(enRuta)) : []
  const soloEnRuta = enRuta !== null && abiertos.length === 1
  // R73: al salir (?despues=1), qué hace después; solo si no tiene otro viaje publicado
  const respuesta = RESPUESTAS.find((x) => x === r) ?? null
  const recogiendoEnGina = recogida?.sentido === "centro_a_vg"

  return (
    <Screen>
      <EnVivo />
      {cabecera}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Ubicacion activa={conectado} />
        {enRuta ? (
          <TarjetaEnRuta
            viaje={enRuta}
            esperanEnCamino={esperanEnCamino}
            terminar={recogida ? <TerminarViaje viaje={enRuta} sinVuelta={false} fija={false} /> : undefined}
          />
        ) : null}
        {soloEnRuta ? <DespuesTarjeta viaje={enRuta} /> : null}
        {recogida ? (
          <TarjetaViaje
            viaje={recogida}
            texto={texto(recogida)}
            listaTramo={listaTramo}
            dicenQueSubieron={listaTramo.filter((e) => e.diceQueSubio).length}
          />
        ) : null}
        <Proximos
          proximos={proximos}
          textos={Object.fromEntries(proximos.map((v) => [v.id, texto(v).titulo.replace(/^Próximo: /, "")]))}
          modo={recogida ? "cadena" : "desde_ruta"}
          puedeAgregar={!sinCuota}
        />
        {cuota ? <CuotaAviso cuota={cuota} /> : null}
        {!sinCuota && !recogiendoEnGina ? <FaixaLista lista={listaTramo} destacada={Boolean(enRuta?.sentido === "centro_a_vg")} /> : null}
        <FranjaCompaneros companeros={datos.companeros} />
        {recogida ? (
          <AccionRecogida viaje={recogida} vehiculo={vehiculo} listaTramo={listaTramo} />
        ) : enRuta ? (
          <TerminarViaje viaje={enRuta} sinVuelta={soloEnRuta} />
        ) : null}
      </div>
      {despues === "1" && soloEnRuta ? <PreguntaDespues viaje={enRuta} inicial={respuesta} /> : null}
      {hoja}
    </Screen>
  )
}

const diaCaracas = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date(iso))

/** El resumen del viaje recién terminado y del día (para la hoja del logro) */
async function resumenDe(choferId: string, viajeId: string): Promise<Resumen | null> {
  const viajes = await cargarViajesChofer(choferId)
  const v = viajes.find((x) => x.id === viajeId)
  if (!v) return null
  const hoy = viajes.filter((x) => diaCaracas(x.cerrado) === diaCaracas(v.cerrado))
  return {
    sentido: SENTIDOS[v.sentido].corto,
    llevo: sumaPersonas(v.llevo),
    puestos: v.puestos,
    duracion: v.minutos !== null ? duracion(v.minutos) : "—",
    viajesHoy: hoy.length,
    personasHoy: hoy.reduce((n, x) => n + sumaPersonas(x.llevo), 0),
  }
}
