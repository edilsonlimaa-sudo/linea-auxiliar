import { AgregarViaje } from "@/components/chofer/agregar-viaje"
import { Companeros } from "@/components/chofer/companeros"
import { EstadoEnCabecera, EstadoServicio } from "@/components/chofer/conexion"
import { ListaTramo } from "@/components/chofer/lista-tramo"
import { DespuesFoco } from "@/components/chofer/despues-foco"
import { EnRutaCompacto } from "@/components/chofer/en-ruta-compacto"
import { PreguntarVuelta, type Respuesta } from "@/components/chofer/preguntar-vuelta"
import { ViajeChofer } from "@/components/chofer/viaje-chofer"
import { EnVivo } from "@/components/en-vivo"
import type { DatosInicioChofer } from "@/lib/datos/inicio-chofer"
import { saludo } from "@/lib/fechas"
import { libres, type Viaje } from "@/lib/viajes"

/**
 * Inicio del chofer (docs/especificacion.md §8). Lo normal se ve discreto, lo que pide acción se ve claro y el resto
 * queda a un toque.
 * Sin viajes: un bloque azul con el saludo, el estado y "Publicar un viaje"; los compañeros en su franja.
 * Con viajes abiertos: el estado en una línea, el viaje en foco (con su acción pegada abajo), los próximos plegados.
 */
export function InicioChofer({
  nombre,
  datos,
  preguntarVuelta = false,
  respuesta = null,
}: {
  nombre: string
  datos: DatosInicioChofer
  preguntarVuelta?: boolean // recién salió (?vuelta=1): preguntar por la vuelta (R61)
  respuesta?: Respuesta | null // desde el foco "¿Qué haces después?" (R75): la hoja abre con esta respuesta
}) {
  const { conectado, enRuta, recogida, proximos, companeros, viajesCompaneros, ultimo, vehiculo } = datos
  const abiertos = [enRuta, recogida, ...proximos].filter((v) => v !== null)
  const porId = new Map<string, Viaje>(abiertos.map((v) => [v.id, v]))
  const publicados = [recogida, ...proximos].filter((v) => v !== null).length
  // La lista hacia Valle Grande es del tramo, no de un viaje: la ven todos los choferes (§5.17). Si este chofer está
  // recogiendo en Gina o va en ruta hacia Valle Grande, la misma lista deja subir a la gente (R64, R67)
  const enGina =
    recogida?.sentido === "centro_a_vg" && recogida.estado === "en_parada"
      ? { viajeId: recogida.id, plan: recogida.gina ?? [], libres: libres(recogida) }
      : null
  const haciaValle = enRuta?.sentido === "centro_a_vg" ? { viajeId: enRuta.id, libres: libres(enRuta) } : null
  const lista = <ListaTramo lista={datos.listaTramo} enGina={enGina} enRuta={haciaValle} />
  // R67: en ruta hacia Valle Grande, quien espera en el camino sin carro y cabe va como aviso en el viaje
  const esperanEnCamino = haciaValle
    ? datos.listaTramo.filter((e) => !e.enGina && !e.diceQueSubio && e.personas <= haciaValle.libres)
    : undefined
  // R62/R66: en Gina, quienes dicen que ya se montaron y no están marcados: Salir lo advierte
  const dicenQueSubieron = enGina ? datos.listaTramo.filter((e) => e.diceQueSubio).map((e) => e.nombre) : undefined

  // Sin viajes abiertos: "¿salgo ahora?"
  if (abiertos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EnVivo />
        <section aria-labelledby="titulo-inicio" className="relative overflow-hidden rounded-2xl bg-header text-header-foreground shadow-md">
          {/* Franja amarilla de la línea, como en el Inicio del pasajero */}
          <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-signal" />
          <div className="flex flex-col gap-4 p-4 pt-6">
            <div>
              <p className="text-sm opacity-90">
                {saludo()}, {nombre.split(" ")[0]}
              </p>
              <h1 id="titulo-inicio" className="text-xl leading-tight font-bold">
                ¿Sales a trabajar?
              </h1>
            </div>
            <EstadoEnCabecera conectado={conectado} />
            <AgregarViaje modo="primero" ultimo={ultimo} />
          </div>
          <Companeros companeros={companeros} viajes={viajesCompaneros} chofer={nombre} enCabecera />
        </section>
        {lista}
      </div>
    )
  }

  // Con viajes abiertos: "¿qué hago ahora y a quién recojo?"
  // Con una recogida en curso, el viaje nuevo queda como próximo; si solo va en ruta, empieza ya (R11–R13)
  const modoAgregar = recogida ? "cadena" : "desde_ruta"
  // El viaje nuevo sale de donde termina el último de la cadena: se sugiere el sentido contrario a ese
  const finDeCadena = abiertos.at(-1)
  const sugerencia = finDeCadena ? { sentido: finDeCadena.sentido, puestos: finDeCadena.puestos } : ultimo

  return (
    <div className="flex flex-col gap-4">
      <EnVivo />
      <h1 className="sr-only">Inicio</h1>
      {/* R75: el viaje en ruta, compacto y pegado arriba; se abre en su lugar */}
      {enRuta && (
        <EnRutaCompacto
          viaje={enRuta}
          esperanEnCamino={esperanEnCamino}
          sinVuelta={abiertos.length === 1}
          faltaDespues={abiertos.length === 1 && enRuta.despues !== "pausa" && enRuta.despues !== "ultimo"}
        />
      )}
      {/* Conexión y ubicación (R40) en una línea: solo crece si el GPS falla */}
      <EstadoServicio conectado={conectado} viajesAbiertos={publicados} />
      {lista}
      {/* R61/R73: solo si va en ruta sin otro viaje publicado (con la vuelta ya publicada no se pregunta) */}
      {preguntarVuelta && enRuta && abiertos.length === 1 && <PreguntarVuelta viaje={enRuta} inicial={respuesta} />}

      {/* El foco: el próximo viaje con su acción pegada abajo; en ruta sin próximo, qué hace después (R75) */}
      {recogida ? (
        <ViajeChofer viaje={recogida} porId={porId} vehiculo={vehiculo} dicenQueSubieron={dicenQueSubieron} barraFija />
      ) : (
        enRuta && abiertos.length === 1 && <DespuesFoco viaje={enRuta} />
      )}

      {proximos.length > 0 && (
        <section aria-labelledby="titulo-proximos" className="flex flex-col gap-3">
          <h2 id="titulo-proximos" className="mt-2 text-base font-bold">
            Próximos viajes
          </h2>
          {proximos.map((v) => (
            <ViajeChofer key={v.id} viaje={v} porId={porId} vehiculo={vehiculo} plegado />
          ))}
        </section>
      )}

      <AgregarViaje modo={modoAgregar} ultimo={sugerencia} />
      {/* También trabajando: coordinarse con los compañeros, a un toque (§8) */}
      <Companeros companeros={companeros} viajes={viajesCompaneros} chofer={nombre} />
      {/* Espacio para que la barra fija de abajo no tape lo último de la página */}
      <div aria-hidden className="h-36" />
    </div>
  )
}
