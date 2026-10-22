import { ClockIcon, SparklesIcon } from "lucide-react"

import { Asientos } from "@/components/pasajero/asientos"
import { BotonApartar } from "@/components/pasajero/boton-apartar"
import { PerfilChofer } from "@/components/pasajero/perfil-chofer"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { ViajeConChofer } from "@/lib/datos/inicio-pasajero"
import type { Punto } from "@/lib/mapa"
import { cn } from "@/lib/utils"
import { cabe, libres, llegada, SENTIDOS, type Viaje } from "@/lib/viajes"

/**
 * El estado como etiqueta (§8), solo cuando dice algo que el título no dice: que es el próximo viaje del chofer o
 * que el carro ya salió y se le pide en el camino (hacia Valle Grande no se pide: recoge a los de la lista, R67).
 * "Recogiendo ahora" o "Recoge en ~8 min" ya lo dice el título.
 */
function EtiquetaEstado({ estado, porLista }: { estado: Viaje["estado"]; porLista: boolean }) {
  if (estado === "programado")
    return (
      <Badge variant="outline">
        <ClockIcon aria-hidden /> Próximo viaje
      </Badge>
    )
  if (estado === "en_ruta") return <Badge variant="warning">{porLista ? "Recoge en el camino" : "Pide en el camino"}</Badge>
  return null
}

/**
 * Una unidad que el pasajero puede escoger (R16), corta para comparar varias (§8). Orden de lectura: estado →
 * cuándo recoge → puestos → quién maneja → Apartar y el mapa. Foto del carro y aire, al abrir "Ver chofer y carro".
 * `destacada`: la primera con puesto ("Recoge primero"). Al apartar sube la hoja "¿Dónde te recogemos?" (R27, R57).
 */
export function TarjetaUnidad({
  viaje,
  porId,
  reservaAnterior,
  yo = null,
  lugarInicial,
  personas = 1,
  destacada = false,
  porLista = false,
}: {
  viaje: ViajeConChofer
  porId: Map<string, Viaje>
  reservaAnterior?: string | null
  yo?: Punto | null // GPS del pasajero (de su espera), para la distancia en el mapa
  lugarInicial?: string | null // el de su espera, si estaba esperando (R27)
  personas?: number // cuántos van, si ya lo dijo al esperar (R57); si no, se pregunta al apartar
  destacada?: boolean
  porLista?: boolean // Centro → Valle Grande: no se aparta, se sube por la lista del tramo (§5.17)
}) {
  const cuando = llegada(viaje, porId)
  const n = libres(viaje)
  const hayPuesto = n > 0
  const caben = cabe(viaje, personas) // el grupo viaja junto: puestos para todos (R57)
  const enRuta = viaje.estado === "en_ruta"
  const recogiendo = viaje.estado === "en_parada" || viaje.estado === "llegando"
  const { chofer } = viaje

  // ¿Cuántos van? se pregunta al apartar, hasta los puestos libres (máx. 4, R57). Lleno: no se aparta (R59)
  const maxPersonas = Math.min(n, 4)
  const textoBoton = enRuta ? "Pedir que me recoja" : "Apartar puesto"

  return (
    <Card
      size="sm"
      className={cn("gap-3 rounded-2xl shadow-xs ring-2", destacada ? "ring-primary" : "ring-border", recogiendo && !destacada && "ring-success/60")}
    >
      {/* La que recoge primero: una franja arriba, la respuesta más útil de la pantalla */}
      {destacada && (
        <p className="-mt-(--card-spacing) flex items-center gap-1.5 bg-primary px-(--card-spacing) py-1.5 text-sm font-bold text-primary-foreground">
          <SparklesIcon aria-hidden className="size-4" /> Recoge primero
        </p>
      )}
      {/* 1. Estado y cuándo recoge: es lo que decide primero */}
      <CardHeader className="gap-1.5">
        <EtiquetaEstado estado={viaje.estado} porLista={porLista} />
        {/* La ruta siempre a la vista (R39): nadie debe adivinar adónde va el carro */}
        <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[viaje.sentido].largo}</p>
        <p className={cn("text-lg leading-tight font-bold", recogiendo && "text-success")}>{cuando.principal}</p>
        {cuando.detalle && <p className="text-sm text-muted-foreground">{cuando.detalle}</p>}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* 2. ¿Hay puesto? */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Asientos puestos={viaje.puestos} ocupados={Math.min(viaje.ocupados, viaje.puestos)} />
          {hayPuesto && !caben ? (
            <Badge variant="warning">
              {n === 1 ? "Solo 1 libre" : `Solo ${n} libres`} para {personas}
            </Badge>
          ) : hayPuesto ? (
            <Badge variant="success">{n === 1 ? "1 libre" : `${n} libres`}</Badge>
          ) : (
            <Badge variant="secondary">Lleno</Badge>
          )}
        </div>

        {/* 3. ¿Quién maneja? Una sola vez: al tocarlo, su perfil y el carro */}
        <PerfilChofer chofer={chofer} />
      </CardContent>

      {/* 4. La acción, con el mapa al lado */}
      <CardFooter className="flex-col items-stretch gap-2">
        <div className="flex items-start gap-2">
          {porLista ? (
            // Hacia Valle Grande se sube por la lista: el carro llama en orden a quienes se anotaron (R64); ya en
            // ruta, recoge a los del camino (R67)
            <p className="min-h-11 flex-1 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">
              {!hayPuesto
                ? "Va lleno"
                : enRuta
                  ? `Ya salió de Gina con ${n === 1 ? "1 puesto" : `${n} puestos`}: puede recogerte al pasar`
                  : "Sube por la lista: llama en orden a los anotados"}
            </p>
          ) : hayPuesto ? (
            <BotonApartar
              viajeId={viaje.id}
              texto={textoBoton}
              variante="default"
              reservaAnterior={reservaAnterior}
              lugarInicial={lugarInicial}
              personas={Math.min(personas, maxPersonas)}
              maxPersonas={maxPersonas}
              className="min-w-0 flex-1"
            />
          ) : (
            // Sin lista de espera (R59): lleno no se aparta; "Avísame" está al final de la lista
            <p className="min-h-11 flex-1 rounded-2xl bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">Va lleno: no aparta más puestos</p>
          )}
          <VerEnMapa choferId={viaje.chofer_id} chofer={chofer.nombre} yo={yo} compacto />
        </div>
        {enRuta && !porLista && <p className="text-sm text-muted-foreground">El chofer te confirma si puede pasar por ti.</p>}

      </CardFooter>
    </Card>
  )
}
