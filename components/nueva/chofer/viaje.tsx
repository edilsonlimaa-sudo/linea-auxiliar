"use client"

import { Clock, Ellipsis, Lightbulb, Loader2, Minus, Moon, Plus, Ticket, Trash2, Users } from "lucide-react"
import * as React from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { ErrorAccion, Opcion, puestosTexto } from "@/components/nueva/chofer/comun"
import { FaixaLista, FilaLista, ListaConAcciones } from "@/components/nueva/chofer/gina"
import { FilaPasajero, SubioAlguienDrawer } from "@/components/nueva/chofer/pasajeros"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/nueva/ui/drawer"
import { Input } from "@/components/nueva/ui/input"
import { cambiarPuestos, cancelarViaje, meAtraso } from "@/lib/acciones/chofer"
import type { EntradaTramo, FilaChofer, ViajeChofer } from "@/lib/datos/inicio-chofer"
import { hora } from "@/lib/fechas"
import { MOTIVOS_CANCELAR, type MotivoCancelar, OPCION_CANCELAR } from "@/lib/motivos-cancelar"
import { tarifaEn, textoTarifa } from "@/lib/tarifas"
import { cn } from "@/lib/utils"
import { duracion, enEspera, libres, SENTIDOS, sumaPersonas } from "@/lib/viajes"

// El viaje del chofer en la interfaz nueva. Reglas de components/chofer/viaje-chofer.tsx y en-ruta-compacto.tsx

const ETIQUETA: Partial<Record<ViajeChofer["estado"], string>> = {
  en_camino: "Vas a recoger",
  llegando: "Llegando",
  en_parada: "Recogiendo",
  en_ruta: "En ruta",
}

/** El reloj del celular, redondeado: en el servidor 0 (así no cambia al hidratar) */
function useAhora(cadaMs: number) {
  const suscribir = React.useCallback(
    (avisar: () => void) => {
      const id = setInterval(avisar, cadaMs)
      return () => clearInterval(id)
    },
    [cadaMs]
  )
  return React.useSyncExternalStore(suscribir, () => Math.floor(Date.now() / cadaMs) * cadaMs, () => 0)
}

function Ocupacion({ viaje }: { viaje: ViajeChofer }) {
  const n = libres(viaje)
  const ocupados = Math.min(viaje.ocupados, viaje.puestos)
  const espera = enEspera(viaje)
  return (
    <Badge variant={n === 0 ? "default" : "secondary"}>
      <Users className="size-3.5" />
      {n === 0 ? "Carro lleno" : `${ocupados} de ${viaje.puestos} puestos`}
      {espera > 0 ? ` · ${espera} en espera` : ""}
    </Badge>
  )
}

/**
 * El viaje que está recogiendo: cuándo llega (lo que les dijo a los pasajeros), "Me atraso" mientras va (R70), sus
 * opciones (puestos, cancelar) y la lista de su carro.
 */
export function TarjetaViaje({
  viaje,
  texto,
  listaTramo,
  dicenQueSubieron,
}: {
  viaje: ViajeChofer
  texto: { titulo: string; detalle: string } // calculado en el servidor (depende de la hora)
  listaTramo: EntradaTramo[]
  dicenQueSubieron: number
}) {
  const haciaValle = viaje.sentido === "centro_a_vg"
  const conPuesto = viaje.lista.filter((f) => f.confirmado && !f.pendiente)
  const enLista = viaje.lista.filter((f) => !f.confirmado && !f.pendiente)
  const enGina = haciaValle && viaje.estado === "en_parada"
  const recogerEnCamino = enGina ? (viaje.gina ?? []).filter((e) => e.rol === "guardar") : []

  return (
    <>
      <section className="flex flex-col gap-3 rounded-3xl border border-primary/30 bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge>{ETIQUETA[viaje.estado] ?? "Tu viaje"}</Badge>
          <Ocupacion viaje={viaje} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{SENTIDOS[viaje.sentido].largo}</p>
          <h2 className="font-heading text-2xl font-semibold">{SENTIDOS[viaje.sentido].corto}</h2>
        </div>
        <p className="flex items-start gap-2 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            <span className="font-medium">{texto.titulo}</span>
            {texto.detalle ? <span className="block text-muted-foreground">{texto.detalle}</span> : null}
          </span>
        </p>
        {viaje.estado === "en_camino" ? <MeAtrasoBoton viajeId={viaje.id} estadoEn={viaje.estado_en} etaMin={viaje.eta_min} /> : null}
        {recogerEnCamino.length > 0 ? (
          <p role="status" className="rounded-2xl bg-primary/10 p-3 text-sm text-primary">
            <strong>Al salir, recoges en el camino:</strong> {recogerEnCamino.map((e) => `${e.nombre} · ${e.lugar}`).join(", ")}
          </p>
        ) : null}
        <OpcionesDrawer viajeId={viaje.id} puestos={viaje.puestos} ocupados={viaje.ocupados} enRuta={false} enCamino={viaje.estado === "en_camino"} />
      </section>

      {haciaValle ? (
        <>
          {/* Hacia Valle Grande nadie aparta: se sube desde la lista de Gina (R64) */}
          {enGina ? (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-lg font-semibold">Tu plan en Gina</h3>
                <Ocupacion viaje={viaje} />
              </div>
              <ListaConAcciones lista={listaTramo} enGina={{ viajeId: viaje.id, plan: viaje.gina ?? [], libres: libres(viaje) }} enRuta={null} agrupada />
              <p className="text-xs text-muted-foreground">Al salir, los de &quot;Guarda puesto&quot; quedan contigo y los de &quot;Sigue&quot; esperan el próximo carro.</p>
            </section>
          ) : (
            <section className="flex flex-col gap-3">
              <h3 className="font-heading text-lg font-semibold">La lista en Gina</h3>
              <FaixaLista lista={listaTramo} destacada={dicenQueSubieron > 0} />
              <p className="text-xs text-muted-foreground">Al tocar &quot;Ya llegué&quot; en Gina, la app arma tu plan con tus {viaje.puestos} puestos.</p>
            </section>
          )}
          {conPuesto.length > 0 ? <Lista titulo="A bordo" filas={conPuesto} viaje={viaje} /> : null}
        </>
      ) : (
        <>
          <Lista
            titulo="Reservaron"
            filas={conPuesto}
            viaje={viaje}
            vacio="Todavía nadie apartó puesto. Los pasajeros ya te ven en camino."
            pie="El orden es el de la reserva. Al salir, suben los que caben."
          />
          {enLista.length > 0 ? <Lista titulo="Lista de espera" filas={enLista} viaje={viaje} /> : null}
        </>
      )}
      {libres(viaje) > 0 ? <SubioAlguienDrawer viajeId={viaje.id} enRuta={false} libres={libres(viaje)} /> : null}
    </>
  )
}

/**
 * El viaje en ruta (R75): cuándo salió, cuántos van y cuántos caben, el pasaje si rige la tarifa especial (R80) y la
 * gente: primero lo que no puede esperar (pedidos, a quién recoger en el camino, quien espera en el camino hacia Valle
 * Grande, R67) y después quienes van a bordo. `terminar` va dentro si hay otro viaje en foco.
 */
export function TarjetaEnRuta({
  viaje,
  esperanEnCamino = [],
  terminar,
}: {
  viaje: ViajeChofer
  esperanEnCamino?: EntradaTramo[]
  terminar?: React.ReactNode
}) {
  const ahora = useAhora(30_000)
  const salio = viaje.salida_en ?? viaje.estado_en
  const pedidos = viaje.lista.filter((f) => f.pendiente)
  const porRecoger = viaje.lista.filter((f) => f.estado === "activa" && !f.pendiente)
  const aBordo = viaje.lista.filter((f) => f.estado === "subio")
  const tarifa = tarifaEn(new Date(salio))
  const n = libres(viaje)

  return (
    <>
      <section className="flex flex-col gap-3 rounded-3xl bg-primary p-4 text-primary-foreground">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm opacity-90">{SENTIDOS[viaje.sentido].largo}</p>
            <h2 className="font-heading text-2xl font-semibold">En ruta</h2>
          </div>
          <span className="text-right text-sm opacity-90">
            {/* La hora, solo en el navegador: el formato del servidor no es igual al del celular */}
            {ahora > 0 ? (
              <>
                Salió {hora(salio)}
                <span className="block">hace {duracion(Math.max(0, (ahora - new Date(salio).getTime()) / 60_000))}</span>
              </>
            ) : null}
          </span>
        </div>
        <p className="flex items-center gap-2 font-medium">
          <Users className="size-5" />
          {sumaPersonas(aBordo) === 1 ? "1 a bordo" : `${sumaPersonas(aBordo)} a bordo`}
          <span className="font-normal opacity-90">· {n === 0 ? "carro lleno" : n === 1 ? "1 libre" : `${n} libres`}</span>
        </p>
        {tarifa.tipo !== "normal" ? (
          <p className="flex items-center gap-2 rounded-2xl bg-primary-foreground/10 p-3">
            {tarifa.tipo === "nocturna" ? <Moon className="size-5 shrink-0" /> : <Ticket className="size-5 shrink-0" />}
            <span>
              Pasaje <strong>{textoTarifa(tarifa)}</strong>
            </span>
          </p>
        ) : null}
      </section>

      {pedidos.length > 0 ? <Lista titulo="Piden que pases por ellos" filas={pedidos} viaje={viaje} /> : null}
      {porRecoger.length > 0 ? <Lista titulo="Recoge en el camino" detalle="Márcalos cuando suban." filas={porRecoger} viaje={viaje} destacada /> : null}
      {esperanEnCamino.length > 0 ? (
        <section className="flex flex-col gap-2">
          <div>
            <h3 className="font-heading text-lg font-semibold">Esperan en el camino</h3>
            <p className="text-xs text-muted-foreground">Toca Voy si pasas por ahí: los demás choferes dejan de verlos.</p>
          </div>
          <ol className="divide-y rounded-3xl border border-primary/30 bg-card">
            {esperanEnCamino.map((e) => (
              <FilaLista key={e.id} entrada={e} viajeId={viaje.id} puedeIr puedeSubir conNoEstaba />
            ))}
          </ol>
        </section>
      ) : null}
      <Lista titulo="Van contigo" filas={aBordo} viaje={viaje} vacio="Vas vacío. Si alguien se anota en el camino, aparece aquí." />
      <div className="grid grid-cols-2 gap-2">
        {n > 0 ? <SubioAlguienDrawer viajeId={viaje.id} enRuta libres={n} /> : null}
        <OpcionesDrawer viajeId={viaje.id} puestos={viaje.puestos} ocupados={viaje.ocupados} enRuta grande />
      </div>
      {terminar}
    </>
  )
}

function Lista({
  titulo,
  detalle,
  filas,
  viaje,
  vacio,
  pie,
  destacada = false,
}: {
  titulo: string
  detalle?: string
  filas: FilaChofer[]
  viaje: ViajeChofer
  vacio?: string
  pie?: string
  destacada?: boolean
}) {
  if (filas.length === 0 && !vacio) return null
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="font-heading text-lg font-semibold">
          {titulo} {filas.length > 0 ? <span className="text-muted-foreground">· {sumaPersonas(filas)}</span> : null}
        </h3>
        {detalle ? <p className="text-xs text-muted-foreground">{detalle}</p> : null}
      </div>
      {filas.length === 0 ? (
        <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className={cn("divide-y overflow-hidden rounded-3xl border bg-card", destacada && "border-primary/40")}>
          {filas.map((f) => (
            <FilaPasajero key={f.id} fila={f} estadoViaje={viaje.estado} />
          ))}
        </ul>
      )}
      {pie ? <p className="text-xs text-muted-foreground">{pie}</p> : null}
    </section>
  )
}

const MIN = 60_000
const ATRASOS = [5, 10, 15, 20, 30, 45, 60] as const
const atrasoTexto = (m: number) => (m === 60 ? "1 hora" : `${m} min`)

/**
 * "Me atraso" (R70): una hora nueva con un toque. Si ya pasó la que dijo, un aviso con el botón a mano (sus pasajeros
 * ven "en cualquier momento"); antes, discreto.
 */
function MeAtrasoBoton({ viajeId, estadoEn, etaMin }: { viajeId: string; estadoEn: string; etaMin: number }) {
  const [abierta, setAbierta] = React.useState(false)
  const [escogido, setEscogido] = React.useState<number>()
  const { ejecutar, pendiente, error } = useAccion()
  const ahora = useAhora(15_000)
  const prometida = new Date(estadoEn).getTime() + etaMin * MIN
  const vencido = ahora > 0 && ahora >= prometida

  return (
    <Drawer open={abierta} onOpenChange={(v) => !pendiente && setAbierta(v)} showSwipeHandle>
      {vencido ? (
        <div role="status" className="flex flex-col gap-2 rounded-2xl bg-destructive/10 p-3 text-sm">
          <p>
            <strong>Ya pasó la hora que dijiste ({hora(new Date(prometida).toISOString())}).</strong> Tus pasajeros ven &quot;en cualquier
            momento&quot;: dales una hora nueva.
          </p>
          <DrawerTrigger render={<Button />}>
            <Clock /> Dar una hora nueva
          </DrawerTrigger>
        </div>
      ) : (
        <DrawerTrigger render={<Button variant="outline" className="self-start" />}>
          <Clock /> Me atraso
        </DrawerTrigger>
      )}
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          <DrawerTitle className="font-heading text-xl">¿En cuánto llegas a recoger?</DrawerTitle>
          <DrawerDescription>Los pasajeros ven la hora nueva al momento.</DrawerDescription>
        </DrawerHeader>
        <div className="grid grid-cols-2 gap-2 px-4 pb-6">
          {ATRASOS.map((m) => (
            <Button
              key={m}
              variant="outline"
              size="lg"
              className="h-auto min-h-14 flex-col gap-0 py-2"
              disabled={pendiente}
              onClick={() => (setEscogido(m), ejecutar(() => meAtraso(viajeId, m), () => setAbierta(false)))}
            >
              <span className="flex items-center gap-1.5 font-heading text-base font-semibold">
                {pendiente && escogido === m ? <Loader2 className="animate-spin" /> : null}
                {atrasoTexto(m)}
              </span>
              {ahora > 0 ? <span className="text-xs text-muted-foreground">a las {hora(new Date(ahora + m * MIN).toISOString())}</span> : null}
            </Button>
          ))}
          <ErrorAccion error={error} className="col-span-2" />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/** Lo que se usa poco (R24, R72): cambiar los puestos y cancelar el viaje con su motivo */
export function OpcionesDrawer({
  viajeId,
  puestos,
  ocupados,
  enRuta,
  enCamino = false,
  grande = false,
}: {
  viajeId: string
  puestos: number
  ocupados: number
  enRuta: boolean
  enCamino?: boolean
  grande?: boolean
}) {
  const [abierta, setAbierta] = React.useState(false)
  const [nuevos, setNuevos] = React.useState(puestos)
  const [cancelando, setCancelando] = React.useState(false)
  const accion = useAccion()
  const minimo = enRuta ? Math.max(1, ocupados) : 1

  return (
    <Drawer open={abierta} onOpenChange={(v) => (setAbierta(v), setNuevos(puestos), setCancelando(false))} showSwipeHandle>
      <DrawerTrigger render={<Button variant={grande ? "outline" : "ghost"} size={grande ? "lg" : "sm"} className={cn(!grande && "self-start")} />}>
        <Ellipsis /> Opciones
      </DrawerTrigger>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        {cancelando ? (
          <Cancelar
            viajeId={viajeId}
            ocupados={ocupados}
            enCamino={enCamino}
            onVolver={() => setCancelando(false)}
            onListo={() => (setCancelando(false), setAbierta(false))}
          />
        ) : (
          <>
            <DrawerHeader>
              <DrawerTitle className="font-heading text-xl">Opciones del viaje</DrawerTitle>
              <DrawerDescription>Cambios que se hacen poco.</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col gap-6 px-4 pb-6">
              <section className="flex flex-col gap-3">
                <h3 className="font-medium">Puestos del carro</h3>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon-lg" aria-label="Un puesto menos" disabled={nuevos <= minimo} onClick={() => setNuevos((n) => n - 1)}>
                    <Minus />
                  </Button>
                  <output aria-live="polite" className="min-w-16 text-center font-heading text-4xl font-semibold tabular-nums">
                    {nuevos}
                  </output>
                  <Button variant="outline" size="icon-lg" aria-label="Un puesto más" disabled={nuevos >= 8} onClick={() => setNuevos((n) => n + 1)}>
                    <Plus />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">No puedes bajar de los puestos que ya tienen reserva.</p>
                <Button disabled={nuevos === puestos || accion.pendiente} onClick={() => accion.ejecutar(() => cambiarPuestos(viajeId, nuevos), () => setAbierta(false))}>
                  {accion.pendiente ? <Loader2 className="animate-spin" /> : null}
                  Guardar {puestosTexto(nuevos)}
                </Button>
                <ErrorAccion error={accion.error} />
              </section>
              {!enRuta ? (
                <section className="flex flex-col gap-2 border-t pt-5">
                  <h3 className="font-medium">Cancelar este viaje</h3>
                  <p className="text-sm text-muted-foreground">Los anotados tendrán que escoger otro carro.</p>
                  <Button variant="destructive" onClick={() => setCancelando(true)}>
                    <Trash2 /> Cancelar viaje
                  </Button>
                </section>
              ) : null}
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

/** R72: por qué cancela, con un toque. Dos motivos tienen otra salida sin que nadie pierda su puesto */
function Cancelar({
  viajeId,
  ocupados,
  enCamino,
  onVolver,
  onListo,
}: {
  viajeId: string
  ocupados: number
  enCamino: boolean
  onVolver: () => void
  onListo: () => void
}) {
  const [motivo, setMotivo] = React.useState<MotivoCancelar>()
  const [detalle, setDetalle] = React.useState("")
  const { ejecutar, pendiente, error } = useAccion()
  const sugerencia =
    motivo === "cambiar_hora" && enCamino
      ? { texto: "Usa «Me atraso» en tu viaje: das una hora nueva y nadie pierde su puesto.", boton: "Volver y usar Me atraso", alTocar: onListo }
      : motivo === "me_equivoque"
        ? { texto: "Si son los puestos, cámbialos en «Puestos del carro»: nadie pierde su lugar.", boton: "Volver a los puestos", alTocar: onVolver }
        : null

  return (
    <>
      <DrawerHeader>
        <DrawerTitle className="font-heading text-xl">¿Por qué cancelas?</DrawerTitle>
        <DrawerDescription>
          {ocupados === 0
            ? "Nadie ha apartado todavía."
            : ocupados === 1
              ? "La persona anotada tendrá que escoger otro carro."
              : `Las ${ocupados} personas anotadas tendrán que escoger otro carro.`}
        </DrawerDescription>
      </DrawerHeader>
      <div className="flex max-h-[55svh] flex-col gap-2 overflow-y-auto px-4">
        {MOTIVOS_CANCELAR.map((m) => (
          <Opcion key={m} nombre="motivo-cancelar" elegida={motivo === m} onElegir={() => setMotivo(m)} className="justify-start text-left">
            {OPCION_CANCELAR[m]}
          </Opcion>
        ))}
        {motivo === "otra" ? (
          <label className="flex flex-col gap-2">
            <span className="font-medium">
              ¿Qué pasó? <span className="font-normal text-muted-foreground">(opcional)</span>
            </span>
            <Input value={detalle} maxLength={120} onChange={(e) => setDetalle(e.target.value)} />
          </label>
        ) : null}
        {sugerencia ? (
          <div role="status" className="flex flex-col gap-2 rounded-2xl bg-primary/10 p-3 text-sm">
            <p className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
              {sugerencia.texto}
            </p>
            <Button variant="outline" onClick={sugerencia.alTocar}>
              {sugerencia.boton}
            </Button>
          </div>
        ) : null}
      </div>
      <DrawerFooter>
        <ErrorAccion error={error} />
        <Button variant="destructive" size="lg" disabled={!motivo || pendiente} onClick={() => motivo && ejecutar(() => cancelarViaje(viajeId, motivo, detalle), onListo)}>
          {pendiente ? <Loader2 className="animate-spin" /> : <Trash2 />}
          {sugerencia ? "Cancelar igual" : "Cancelar el viaje"}
        </Button>
        <Button variant="ghost" size="lg" disabled={pendiente} onClick={onVolver}>
          No, volver
        </Button>
      </DrawerFooter>
    </>
  )
}
