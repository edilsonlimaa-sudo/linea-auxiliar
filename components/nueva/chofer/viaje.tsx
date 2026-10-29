"use client"

import { Clock, Ellipsis, Lightbulb, Loader2, Minus, Moon, Plus, Ticket, Trash2, Users } from "lucide-react"
import * as React from "react"

import { useAccion } from "@/components/chofer/use-accion"
import { ErrorAccion, Opcion } from "@/components/nueva/chofer/comun"
import { ETIQUETA, puestosTexto } from "@/lib/nueva/textos"
import { FilaLista, ListaConAcciones } from "@/components/nueva/chofer/gina"
import { FilaPasajero, SubioAlguienDrawer } from "@/components/nueva/chofer/pasajeros"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/nueva/ui/drawer"
import { Input } from "@/components/nueva/ui/input"
import { cambiarPuestos, cancelarViaje, meAtraso } from "@/lib/acciones/chofer"
import type { EntradaTramo, FilaChofer, ViajeChofer } from "@/lib/datos/inicio-chofer"
import { hora } from "@/lib/fechas"
import { MOTIVOS_CANCELAR, type MotivoCancelar, OPCION_CANCELAR } from "@/lib/motivos-cancelar"
import { bolivares } from "@/lib/bancos"
import { tarifaEn } from "@/lib/tarifas"
import { cn } from "@/lib/utils"
import { duracion, enEspera, libres, SENTIDOS, sumaPersonas } from "@/lib/viajes"

// El viaje del chofer en la interfaz nueva. Reglas de components/chofer/viaje-chofer.tsx y en-ruta-compacto.tsx

const personasEsperando = (n: number) => (n === 0 ? "Nadie esperando" : n === 1 ? "1 persona esperando" : `${n} personas esperando`)

/** "4 puestos", discreto, arriba a la derecha de la tarjeta del viaje (la ocupación va en la lista) */
function Puestos({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-1 text-sm text-muted-foreground">
      <Users className="size-3.5" />
      {n === 1 ? "1 puesto" : `${n} puestos`}
    </span>
  )
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
 * El viaje que está recogiendo: mientras va, su hora de llegada con las herramientas para ajustarla (R70); después, qué hace; sus
 * opciones (puestos, cancelar) y la lista de su carro.
 */
export function TarjetaViaje({
  viaje,
  texto,
  listaTramo,
}: {
  viaje: ViajeChofer
  texto: { titulo: string; detalle: string } // calculado en el servidor (depende de la hora)
  listaTramo: EntradaTramo[]
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
          <Badge>{ETIQUETA[viaje.estado as keyof typeof ETIQUETA] ?? "Tu viaje"}</Badge>
          <Puestos n={viaje.puestos} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{SENTIDOS[viaje.sentido].largo}</p>
          <h2 className="font-heading text-2xl font-semibold">{SENTIDOS[viaje.sentido].corto}</h2>
        </div>
        {viaje.estado === "en_camino" ? (
          <HoraDeLlegada viajeId={viaje.id} estadoEn={viaje.estado_en} etaMin={viaje.eta_min} donde={texto.titulo} />
        ) : (
          <p className="flex min-w-0 items-start gap-2 text-sm">
            <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              {texto.titulo}
              {texto.detalle ? <span className="block text-xs text-muted-foreground">{texto.detalle}</span> : null}
            </span>
          </p>
        )}
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
            <p className="rounded-2xl bg-primary/5 p-3 text-sm text-muted-foreground">
              <strong className="text-foreground">{personasEsperando(listaTramo.reduce((n, e) => n + e.personas, 0))} en Gina.</strong> Al tocar
              &quot;Ya llegué&quot;, la app arma tu plan con tus {viaje.puestos} puestos. La lista va abajo.
            </p>
          )}
          {conPuesto.length > 0 ? <Lista titulo="A bordo" filas={conPuesto} viaje={viaje} ocupacion /> : null}
        </>
      ) : (
        <>
          <Lista
            titulo="Reservaron"
            filas={conPuesto}
            viaje={viaje}
            ocupacion
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
 * Grande, R67) y después quienes van a bordo.
 */
export function TarjetaEnRuta({ viaje, esperanEnCamino = [] }: { viaje: ViajeChofer; esperanEnCamino?: EntradaTramo[] }) {
  const ahora = useAhora(30_000)
  const salio = viaje.salida_en ?? viaje.estado_en
  const pedidos = viaje.lista.filter((f) => f.pendiente)
  const porRecoger = viaje.lista.filter((f) => f.estado === "activa" && !f.pendiente)
  const aBordo = viaje.lista.filter((f) => f.estado === "subio")
  const tarifa = tarifaEn(new Date(salio))
  const n = libres(viaje)

  return (
    <>
      <section className="flex flex-col gap-3 rounded-3xl border border-primary/30 bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge>En ruta</Badge>
          <Puestos n={viaje.puestos} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{SENTIDOS[viaje.sentido].largo}</p>
          <h2 className="font-heading text-2xl font-semibold">{SENTIDOS[viaje.sentido].corto}</h2>
        </div>
        <p className="flex items-start gap-2 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            En ruta al destino
            {/* La hora, solo en el navegador: el formato del servidor no es igual al del celular */}
            {ahora > 0 ? (
              <span className="block text-xs text-muted-foreground">
                Salió {hora(salio)} · hace {duracion(Math.max(0, (ahora - new Date(salio).getTime()) / 60_000))}
              </span>
            ) : null}
          </span>
        </p>
        {tarifa.tipo !== "normal" ? (
          <div className="flex items-center gap-3 rounded-2xl bg-primary/10 p-3 text-primary">
            {tarifa.tipo === "nocturna" ? <Moon className="size-5 shrink-0" /> : <Ticket className="size-5 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wide uppercase opacity-80">{tarifa.tipo === "nocturna" ? "Tarifa nocturna" : "Tarifa de domingo"}</p>
              <p className="font-heading text-lg font-semibold">Pasaje {bolivares(tarifa.monto)} por puesto</p>
            </div>
          </div>
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
      <Lista
        titulo="Van contigo"
        filas={aBordo}
        viaje={viaje}
        ocupacion
        vacio="Vas vacío. Si alguien se anota en el camino, aparece aquí."
        pie={n > 0 ? "Puedes aceptar reservas en el camino con “Voy”." : undefined}
      />
      {n > 0 ? <SubioAlguienDrawer viajeId={viaje.id} enRuta libres={n} /> : null}
      <OpcionesDrawer viajeId={viaje.id} puestos={viaje.puestos} ocupados={viaje.ocupados} enRuta />
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
  ocupacion = false,
}: {
  titulo: string
  detalle?: string
  filas: FilaChofer[]
  viaje: ViajeChofer
  vacio?: string
  pie?: string
  destacada?: boolean
  ocupacion?: boolean // a la derecha del título, "2 de 4 puestos" del carro
}) {
  if (filas.length === 0 && !vacio) return null
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-lg font-semibold">
            {titulo} {!ocupacion && filas.length > 0 ? <span className="text-muted-foreground">· {sumaPersonas(filas)}</span> : null}
          </h3>
          {detalle ? <p className="text-xs text-muted-foreground">{detalle}</p> : null}
        </div>
        {ocupacion ? <Ocupacion viaje={viaje} /> : null}
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
 * Los minutos desde ahora que pide me_atraso para quedar "m" después de la hora dicha (o de ahora, si ya pasó).
 * me_atraso redondea hacia arriba lo que ya pasó; aquí lo que falta, hacia abajo: queda justo +m.
 */
const desdeAhora = (prometida: number, m: number) => Math.min(120, Math.max(0, Math.floor((prometida - Date.now()) / MIN)) + m)

/**
 * La hora de llegada mientras va a recoger (R70), como herramienta del chofer: la hora que ven sus pasajeros en grande,
 * cuánto falta, y "Ajustar" abre la hoja: +5 min… +1 hora sobre la hora dicha (si ya pasó, desde ahora). Si ya pasó la
 * hora, en rojo: sus pasajeros ven "en cualquier momento".
 */
function HoraDeLlegada({ viajeId, estadoEn, etaMin, donde }: { viajeId: string; estadoEn: string; etaMin: number; donde: string }) {
  const [abierta, setAbierta] = React.useState(false)
  const [escogido, setEscogido] = React.useState<number>()
  const [listo, setListo] = React.useState(false)
  const { ejecutar, pendiente, error } = useAccion()
  const ahora = useAhora(15_000)
  const prometida = new Date(estadoEn).getTime() + etaMin * MIN
  const vencido = ahora > 0 && ahora >= prometida
  const faltan = ahora > 0 ? Math.max(0, Math.ceil((prometida - ahora) / MIN)) : null
  const base = vencido ? ahora : prometida // desde dónde cuentan las opciones

  return (
    <div className={cn("flex flex-col gap-2 rounded-2xl p-3", vencido ? "bg-destructive/10" : "bg-primary/5")}>
      <p className="text-xs font-medium text-muted-foreground">{donde}</p>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {/* La hora, solo en el navegador: el formato del servidor no es igual al del celular */}
          <p className={cn("font-heading text-3xl font-semibold whitespace-nowrap tabular-nums", vencido && "text-destructive")}>
            {ahora > 0 ? hora(new Date(prometida).toISOString()) : "—"}
          </p>
          <p role="status" className={cn("text-sm font-medium", vencido ? "text-destructive" : "text-primary")}>
            {listo ? "Avisado a tus pasajeros" : vencido ? "Ya pasó tu hora" : faltan === null ? "" : faltan === 0 ? "Ya" : `en ${faltan} min`}
          </p>
        </div>
        <Drawer open={abierta} onOpenChange={(v) => !pendiente && setAbierta(v)} showSwipeHandle>
          <DrawerTrigger render={<Button variant={vencido ? "default" : "outline"} className="shrink-0" disabled={ahora === 0} />}>
            <Clock /> Ajustar
          </DrawerTrigger>
          <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
            <DrawerHeader>
              <DrawerTitle className="font-heading text-xl">{vencido ? "¿En cuánto llegas a recoger?" : "¿Cuánto más tarde llegas?"}</DrawerTitle>
              <DrawerDescription>
                {vencido ? "Ya pasó la hora que dijiste." : `Dijiste ${ahora > 0 ? hora(new Date(prometida).toISOString()) : "tu hora"}.`} Los
                pasajeros ven la hora nueva al momento.
              </DrawerDescription>
            </DrawerHeader>
            <div className="grid grid-cols-2 gap-2 px-4 pb-6">
              {ATRASOS.map((m) => (
                <Button
                  key={m}
                  variant="outline"
                  size="lg"
                  className="h-auto min-h-14 flex-col gap-0 py-2"
                  disabled={pendiente}
                  onClick={() => (
                    setEscogido(m),
                    ejecutar(
                      () => meAtraso(viajeId, vencido ? m : desdeAhora(prometida, m)),
                      () => (setAbierta(false), setListo(true), setTimeout(() => setListo(false), 3000))
                    )
                  )}
                >
                  <span className="flex items-center gap-1.5 font-heading text-base font-semibold">
                    {pendiente && escogido === m ? <Loader2 className="animate-spin" /> : null}
                    {vencido ? atrasoTexto(m) : `+${atrasoTexto(m)}`}
                  </span>
                  {ahora > 0 ? <span className="text-xs text-muted-foreground">a las {hora(new Date(base + m * MIN).toISOString())}</span> : null}
                </Button>
              ))}
              <ErrorAccion error={error} className="col-span-2" />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
      {vencido ? <p className="text-sm">Tus pasajeros ven &quot;en cualquier momento&quot;: dales una hora nueva.</p> : null}
    </div>
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
      ? { texto: "Ajusta la hora en tu viaje (+5, +10…): das una hora nueva y nadie pierde su puesto.", boton: "Volver y ajustar la hora", alTocar: onListo }
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
