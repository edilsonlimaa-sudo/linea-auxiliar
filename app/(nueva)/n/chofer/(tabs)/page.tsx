import { CirclePlus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { AccionRecogida, TerminarViaje } from "@/components/nueva/chofer/accion"
import { BotonDesconectarme, EstadoEnCabecera, Ubicacion } from "@/components/nueva/chofer/conexion"
import { CuotaAviso } from "@/components/nueva/chofer/cuota"
import { DespuesTarjeta, PreguntaDespues, type Respuesta } from "@/components/nueva/chofer/despues"
import { FaixaLista } from "@/components/nueva/chofer/gina"
import { type PestanaViaje, PestanasViajes } from "@/components/nueva/chofer/pestanas"
import { TarjetaProximo } from "@/components/nueva/chofer/siguiente"
import { type Resumen, ViajeTerminadoHoja } from "@/components/nueva/chofer/terminado"
import { TarjetaEnRuta, TarjetaViaje } from "@/components/nueva/chofer/viaje"
import { Button } from "@/components/nueva/ui/button"
import { cargarCuotaChofer } from "@/lib/datos/cuota"
import { cargarViajesChofer } from "@/lib/datos/historial"
import { cargarInicioChofer } from "@/lib/datos/inicio-chofer"
import { ETAPA } from "@/lib/nueva/textos"
import { ahoraDelPedido } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { duracion, estadoParaChofer, libres, SENTIDOS, sumaPersonas, type Viaje } from "@/lib/viajes"

export const metadata: Metadata = { title: "Línea Auxiliar" }

const RESPUESTAS: Respuesta[] = ["vuelta", "pausa", "ultimo"]

/**
 * Inicio del chofer en la interfaz nueva (§5.21, §8). Sin viajes: "¿Sales a trabajar?" (o la cuota del día, R76). Con
 * viajes: una pestaña por viaje (en ruta, el que recoge, los próximos; se abre en el que recoge) con "+" al final,
 * y abajo, pegadas, la acción del viaje y la lista de Gina. Las reglas son las de la clásica
 * (components/chofer/inicio-chofer.tsx).
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
  const hoja = logro ? <ViajeTerminadoHoja resumen={logro} /> : null
  // Como el prototipo: el nombre de la app arriba
  const cabecera = <AppHeader title="Línea Auxiliar" action={<EstadoEnCabecera conectado={conectado} sinCuota={sinCuota} viajesAbiertos={publicados} />} />

  // Sin viajes abiertos: "¿salgo ahora?"
  if (abiertos.length === 0) {
    return (
      <Screen>
        <EnVivo />
        {cabecera}
        <div className="flex flex-1 flex-col gap-4 p-4">
          {cuota ? <CuotaAviso cuota={cuota} /> : null}
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
              {conectado ? <BotonDesconectarme /> : null}
            </section>
          ) : null}
          {/* R76: sin la cuota, la lista de Gina no es para él */}
          {!sinCuota ? <FaixaLista lista={listaTramo} /> : null}
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

  const pestanas: PestanaViaje[] = [
    ...(enRuta
      ? [
          {
            id: enRuta.id,
            etapa: ETAPA.en_ruta,
            titulo: SENTIDOS[enRuta.sentido].corto,
            enCurso: true,
            contenido: (
              <>
                <TarjetaEnRuta viaje={enRuta} esperanEnCamino={esperanEnCamino} />
                {soloEnRuta ? <DespuesTarjeta viaje={enRuta} /> : null}
              </>
            ),
            accion: <TerminarViaje viaje={enRuta} sinVuelta={soloEnRuta} />,
          },
        ]
      : []),
    ...(recogida
      ? [
          {
            id: recogida.id,
            etapa: ETAPA[recogida.estado as keyof typeof ETAPA] ?? ETAPA.en_camino,
            titulo: SENTIDOS[recogida.sentido].corto,
            enCurso: true,
            contenido: <TarjetaViaje viaje={recogida} texto={texto(recogida)} listaTramo={listaTramo} />,
            accion: <AccionRecogida viaje={recogida} vehiculo={vehiculo} listaTramo={listaTramo} />,
          },
        ]
      : []),
    ...proximos.map((v) => ({
      id: v.id,
      etapa: ETAPA.programado,
      titulo: SENTIDOS[v.sentido].corto,
      enCurso: false,
      contenido: <TarjetaProximo viaje={v} texto={mayuscula(texto(v).titulo.replace(/^Próximo: /, ""))} cadena={recogida !== null} />,
    })),
  ]
  // Hacia Valle Grande (recogiendo o en ruta), quien dice que ya se montó resalta la lista
  const listaDestacada = (recogida ?? enRuta)?.sentido === "centro_a_vg" && listaTramo.some((e) => e.diceQueSubio)

  return (
    <Screen>
      <EnVivo />
      {cabecera}
      <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
        {/* Lo que falla (GPS, la cuota), arriba de las pestañas; sin nada que decir, no ocupa lugar */}
        <div className="flex flex-col gap-4 pt-4 empty:hidden">
          <Ubicacion activa={conectado} />
          {cuota ? <CuotaAviso cuota={cuota} /> : null}
        </div>
        <PestanasViajes
          pestanas={pestanas}
          inicial={(recogida ?? enRuta ?? proximos[0]).id}
          agregar={sinCuota ? null : { href: `/n/chofer/publicar?modo=${recogida ? "cadena" : "desde_ruta"}` }}
          pie={!sinCuota ? <FaixaLista lista={listaTramo} destacada={listaDestacada} compacta /> : null}
        />
      </div>
      {despues === "1" && soloEnRuta ? <PreguntaDespues viaje={enRuta} inicial={respuesta} /> : null}
      {hoja}
    </Screen>
  )
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

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
