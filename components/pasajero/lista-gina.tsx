"use client"

import { ChevronRightIcon, HandIcon, Loader2Icon, MapPinIcon, TimerIcon, TriangleAlertIcon } from "lucide-react"
import { useCallback, useId, useState, useSyncExternalStore, useTransition } from "react"

import { Opcion } from "@/components/chofer/publicar-viaje"
import { Confirmar } from "@/components/confirmar"
import { Avatar } from "@/components/foto/avatar"
import { QuienVuelve } from "@/components/pasajero/quien-vuelve"
import { TarjetaUnidad } from "@/components/pasajero/tarjeta-unidad"
import { Avatar as AvatarUi, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { estoyEnLista, meFui, sigoEnLista, type Resultado } from "@/lib/acciones/pasajero"
import type { ChoferEnPausa, ViajeConChofer } from "@/lib/datos/inicio-pasajero"
import type { EnListaGina } from "@/lib/datos/lista-gina"
import { hace, hora } from "@/lib/fechas"
import { distanciaMetros, distanciaTexto, GINA, type Punto } from "@/lib/mapa"
import { cn } from "@/lib/utils"
import { iniciales, libres, type Viaje } from "@/lib/viajes"

const LEJOS_M = 300 // más lejos que esto, "¿Ya estás en Gina?" (R62)
const VALE_MIN = 45 // el aviso vence a los 45 min (R62)
const AVISAR_ANTES_MIN = 10 // "¿Sigues ahí?" a los 35 de 45 min (R62)
// "18 min", "menos de 1 min" (el reloj de la pantalla avanza cada 15 s: redondear al más cercano)
const minutos = (m: number) => (m < 1 ? "menos de 1 min" : `${Math.round(m)} min`)

/** Lo que le queda al lugar, de 45 min a 0; en amarillo los últimos 10 */
function BarraVence({ quedan }: { quedan: number }) {
  const porVencer = quedan <= AVISAR_ANTES_MIN
  return (
    <div
      role="progressbar"
      aria-label="Tiempo que vale tu lugar"
      aria-valuemin={0}
      aria-valuemax={VALE_MIN}
      aria-valuenow={Math.round(quedan)}
      aria-valuetext={`Quedan ${minutos(quedan)}`}
      className={cn("h-2.5 overflow-hidden rounded-full", porVencer ? "bg-warning/25" : "bg-muted")}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700", porVencer ? "bg-warning" : "bg-primary")}
        style={{ width: `${Math.min(100, (quedan / VALE_MIN) * 100)}%` }}
      />
    </div>
  )
}
const personas = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)
const suma = (l: EnListaGina[]) => l.reduce((n, e) => n + e.personas, 0)

/**
 * Centro → Valle Grande (docs/especificacion.md §5.17): no se aparta puesto; se anota en la lista del tramo, por orden
 * de llegada, diciendo dónde está ("En Gina", lo principal, o el lugar que escribe). Con aviso: su lugar en grande,
 * los carros que vienen, la lista de todos y "Me fui".
 */
export function ListaGina({
  lista,
  carros,
  porId,
  enPausa,
}: {
  lista: EnListaGina[]
  carros: ViajeConChofer[] // del tramo Centro → Valle Grande: los que no salieron de Gina y los en ruta con puesto
  porId: Map<string, Viaje>
  enPausa: ChoferEnPausa[]
}) {
  const mio = lista.find((e) => e.esMio) ?? null
  // Los que ya salieron de Gina no le sirven a quien espera en Gina; a quien espera en el camino, sí (R67)
  const visibles = mio?.enGina ? carros.filter((v) => v.estado !== "en_ruta") : carros
  // El primero que pasa por Gina con puesto se destaca, como en las unidades (ya vienen ordenadas)
  const primeroConPuesto = visibles.find((v) => v.estado !== "en_ruta" && libres(v) > 0)
  const [hoja, setHoja] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      {mio ? (
        <MiLugar mio={mio} lista={lista} />
      ) : (
        <section aria-labelledby="titulo-lista-tramo" className="flex flex-col gap-3 rounded-3xl border-2 border-primary bg-card p-5">
          <div>
            <h2 id="titulo-lista-tramo" className="text-2xl leading-tight font-bold">
              Lista hacia Valle Grande
            </h2>
            <p className="text-muted-foreground">
              Anótate cuando ya estés esperando y di dónde estás: quien se anota primero, sube primero.
            </p>
          </div>
          <Button variant="signal" size="lg" className="w-full" onClick={() => setHoja(true)}>
            <HandIcon aria-hidden />
            Anotarme en la lista
          </Button>
        </section>
      )}

      {/* La lista, igual para todos (R63): una franja que abre la lista completa, como la del chofer */}
      <FranjaLista lista={lista} />

      {/* Los carros del tramo: cuándo pasan por Gina y con cuántos puestos */}
      <section aria-labelledby="titulo-carros" className="flex flex-col gap-2">
        <h2 id="titulo-carros" className="text-xl font-bold">
          Carros que vienen
        </h2>
        {visibles.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed px-4 py-4">
            <p className="text-muted-foreground">Ningún carro va hacia Valle Grande ahora. Esta pantalla se actualiza sola.</p>
            <QuienVuelve choferes={enPausa} className="border-t pt-3" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* El mismo cartón de las unidades, sin apartar: cuándo pasa por Gina, puestos, chofer, mapa */}
            {visibles.map((v) => (
              <TarjetaUnidad key={v.id} viaje={v} porId={porId} porLista destacada={v.id === primeroConPuesto?.id} />
            ))}
          </div>
        )}
      </section>

      <HojaAviso abierta={hoja} onCerrar={() => setHoja(false)} />
    </div>
  )
}

/** "15 en Gina · 6 en otro lugar", sin las partes en cero */
function resumen(lista: EnListaGina[]) {
  const enGina = suma(lista.filter((e) => e.enGina))
  const otro = suma(lista.filter((e) => !e.enGina))
  return [enGina > 0 && `${enGina} en Gina`, otro > 0 && `${otro} en otro lugar`].filter(Boolean).join(" · ")
}

/** La lista en una línea (caras, cuántos y dónde; su lugar ya está arriba) y, al tocarla, completa en una hoja, con la propia destacada */
function FranjaLista({ lista }: { lista: EnListaGina[] }) {
  const [abierta, setAbierta] = useState(false)
  const visibles = lista.slice(0, 3)
  const total = suma(lista)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        disabled={lista.length === 0}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring disabled:hover:bg-card"
      >
        {lista.length > 0 ? (
          <AvatarGroup className="*:data-[slot=avatar]:ring-card">
            {visibles.map((e) => (
              <AvatarUi key={e.id} className="size-9">
                {e.fotoUrl && <AvatarImage src={e.fotoUrl} alt="" />}
                <AvatarFallback className="bg-secondary text-sm font-bold text-secondary-foreground">{iniciales(e.nombre)}</AvatarFallback>
              </AvatarUi>
            ))}
            {lista.length > visibles.length && <AvatarGroupCount className="size-9 text-sm font-bold">+{lista.length - visibles.length}</AvatarGroupCount>}
          </AvatarGroup>
        ) : (
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block font-bold">La lista</span>
          <span className="block text-[15px] text-muted-foreground">
            {lista.length === 0 ? "Nadie se anotó todavía" : `${total === 1 ? "1 persona" : `${total} personas`} · ${resumen(lista)}`}
          </span>
        </span>
        {lista.length > 0 && <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />}
      </button>

      <Sheet open={abierta} onOpenChange={setAbierta}>
        <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lista hacia Valle Grande</SheetTitle>
            <SheetDescription className="text-base">
              {total === 1 ? "1 persona" : `${total} personas`} por orden de llegada · {resumen(lista)}
            </SheetDescription>
          </SheetHeader>
          <ol className="flex flex-col gap-1 px-5 pb-6">
            {lista.map((e) => (
              <FilaLista key={e.id} entrada={e} />
            ))}
          </ol>
        </SheetContent>
      </Sheet>
    </>
  )
}

function FilaLista({ entrada: e }: { entrada: EnListaGina }) {
  // "hace N min" depende de la hora del celular: solo en el navegador
  const montado = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  return (
    <li className={cn("flex items-center gap-3 rounded-xl px-2 py-2", e.esMio && "bg-signal/20")}>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{e.posicion}</span>
      <Avatar url={e.fotoUrl} nombre={e.nombre} className="size-9 text-sm" />
      <span className="min-w-0 flex-1">
        <span className={cn("block", e.esMio && "font-bold")}>
          {e.nombre}
          {e.personas > 1 && ` +${e.personas - 1}`}
          {e.esMio && " (tú)"}
        </span>
        <span className={cn("block text-sm", e.enGina ? "text-muted-foreground" : "font-bold text-primary")}>{e.enGina ? "En Gina" : e.lugar}</span>
      </span>
      {montado && <span className="text-sm text-muted-foreground">{hace(e.creadaEn)}</span>}
    </li>
  )
}

/** Con aviso: su lugar en grande, "¿Sigues ahí?" cuando va a vencer y "Me fui" (R62) */
function MiLugar({ mio, lista }: { mio: EnListaGina; lista: EnListaGina[] }) {
  const [confirmar, setConfirmar] = useState(false)
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string>()
  const antes = suma(lista.filter((e) => e.posicion < mio.posicion))

  // Reloj: en el servidor no hay hora (0), así no cambia al hidratar
  const suscribir = useCallback((avisar: () => void) => {
    const id = setInterval(avisar, 15_000)
    return () => clearInterval(id)
  }, [])
  const ahora = useSyncExternalStore(suscribir, () => Math.floor(Date.now() / 15_000) * 15_000, () => 0)
  const quedanMin = ahora > 0 ? Math.max(0, (new Date(mio.venceEn).getTime() - ahora) / 60_000) : VALE_MIN
  const porVencer = ahora > 0 && quedanMin <= AVISAR_ANTES_MIN

  const ejecutar = (accion: () => Promise<Resultado>, alTerminar?: () => void) =>
    iniciar(async () => {
      setError(undefined)
      const r = await accion()
      setError(r.error)
      if (r.ok) alTerminar?.()
    })

  return (
    <>
      <section aria-labelledby="titulo-mi-lugar" className="relative overflow-hidden rounded-3xl bg-header text-header-foreground shadow-md">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-signal" />
        <div className="flex flex-col gap-1 p-5 pt-6">
          <p className="text-sm font-bold tracking-wide uppercase opacity-90">Centro → Valle Grande</p>
          <h2 id="titulo-mi-lugar" className="text-[32px] leading-tight font-bold">
            {mio.posicion === 1 ? "Eres el primero" : `Eres el ${mio.posicion}`}
          </h2>
          <p className="text-lg">
            {mio.enGina ? "en Gina" : <>en {mio.lugar}</>}
            {mio.personas > 1 && ` · van ${mio.personas}`}
          </p>
          <p className="text-[15px] opacity-90">
            {antes === 0 ? "Nadie antes que tú." : `Antes que tú: ${personas(antes)}.`}
            {!mio.enGina && " El carro te guarda puesto y te recoge al pasar."}
          </p>
        </div>
      </section>

      {/* Cuánto vale el lugar (R62), siempre a la vista; a los 35 min se vuelve "¿Sigues ahí?" */}
      {porVencer ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border-2 border-warning/50 bg-warning-muted p-4">
          <p className="flex items-start gap-2 font-bold">
            <TriangleAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
            ¿Sigues ahí? Si no respondes, a las {hora(mio.venceEn)} sales de la lista.
          </p>
          <BarraVence quedan={quedanMin} />
          <Button size="lg" disabled={pendiente} onClick={() => ejecutar(sigoEnLista)}>
            {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <HandIcon aria-hidden />}
            Sí, sigo aquí
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
          <p className="flex items-start gap-2">
            <TimerIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              {ahora > 0 ? (
                <>
                  <strong>Tu lugar vale {minutos(quedanMin)} más</strong> · hasta las {hora(mio.venceEn)}
                </>
              ) : (
                <strong>Tu lugar vale 45 min</strong>
              )}
              <span className="block text-[15px] text-muted-foreground">Si sigues esperando, renuévalo cuando quieras.</span>
            </span>
          </p>
          {ahora > 0 && <BarraVence quedan={quedanMin} />}
          <Button variant="outline" disabled={pendiente} onClick={() => ejecutar(sigoEnLista)}>
            {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <HandIcon aria-hidden />}
            Sigo aquí: 45 min más
          </Button>
        </div>
      )}

      {error && !confirmar && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      <Button variant="outline" className="text-destructive" onClick={() => setConfirmar(true)}>
        Me fui
      </Button>
      <Confirmar
        abierto={confirmar}
        onCambiar={setConfirmar}
        titulo="¿Te fuiste?"
        descripcion="Sales de la lista. Si vuelves, te anotas otra vez al final."
        confirmar="Sí, me fui"
        cancelar="No, sigo esperando"
        ocupado={pendiente}
        error={error}
        onConfirmar={() => ejecutar(meFui, () => setConfirmar(false))}
      />
    </>
  )
}

/** Anotarse en la lista: dónde está (En Gina, ya escogido, o el lugar que escribe) y cuántos van (R62) */
function HojaAviso({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  return (
    <Sheet open={abierta} onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
        {/* Se monta al abrir: cada vez empieza limpio */}
        {abierta && <FormAviso onCerrar={onCerrar} />}
      </SheetContent>
    </Sheet>
  )
}

function FormAviso({ onCerrar }: { onCerrar: () => void }) {
  const [donde, setDonde] = useState<"gina" | "otro">("gina")
  const enGina = donde === "gina"
  const [cuantos, setCuantos] = useState(1)
  const [lugar, setLugar] = useState("")
  const [gps, setGps] = useState<{ estado: "no" | "buscando" | "listo" | "error"; punto?: Punto }>({ estado: "no" })
  const [pendiente, iniciar] = useTransition()
  const [error, setError] = useState<string>()
  const idLugar = useId()
  const distancia = enGina && gps.punto ? distanciaMetros(gps.punto, GINA) : null
  const lejos = distancia !== null && distancia > LEJOS_M

  // El GPS se pide con un toque (no al abrir): en Gina, para confirmar que está ahí; en otro lugar, si quiere compartirlo
  const leerGps = () => {
    if (!("geolocation" in navigator)) return setGps({ estado: "error" })
    setGps({ estado: "buscando" })
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ estado: "listo", punto: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
      () => setGps({ estado: "error" }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    )
  }

  const avisar = () =>
    iniciar(async () => {
      const r = await estoyEnLista({
        enGina,
        lugar: enGina ? null : lugar.trim() || null,
        lat: gps.punto?.lat ?? null,
        lng: gps.punto?.lng ?? null,
        personas: cuantos,
        distanciaM: distancia,
      })
      setError(r.error)
      if (r.ok) onCerrar()
    })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        avisar()
      }}
    >
      <SheetHeader>
        <SheetTitle>Anotarme en la lista</SheetTitle>
        <SheetDescription className="text-base">
          Hacia Valle Grande, por orden de llegada. Anótate cuando ya estés esperando: así la lista es justa para todos.
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-5 px-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">¿Dónde estás?</legend>
          <div className="grid grid-cols-2 gap-2">
            <Opcion nombre="donde" elegida={enGina} onElegir={() => setDonde("gina")}>
              En Gina
            </Opcion>
            <Opcion nombre="donde" elegida={!enGina} onElegir={() => setDonde("otro")}>
              En otro lugar
            </Opcion>
          </div>
          {enGina ? (
            gps.estado !== "listo" && <GpsBoton gps={gps} onLeer={leerGps} texto="Confirmar con mi ubicación" />
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor={idLugar} className="text-[15px] font-bold">
                Escribe dónde estás
              </label>
              <Input id={idLugar} value={lugar} onChange={(e) => setLugar(e.target.value)} maxLength={60} placeholder="Ej. Plaza del Indio" autoFocus />
              <p className="text-[15px] text-muted-foreground">El carro te guarda puesto y te recoge al pasar.</p>
              <GpsBoton gps={gps} onLeer={leerGps} texto="Compartir mi ubicación" />
            </div>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">¿Cuántos van?</legend>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((n) => (
              <Opcion key={n} nombre="personas" elegida={cuantos === n} onElegir={() => setCuantos(n)}>
                {n === 1 ? "Solo yo" : `${n} personas`}
              </Opcion>
            ))}
          </div>
          {cuantos > 1 && <p className="text-[15px] text-muted-foreground">Suben juntos: si no caben todos, esperan el siguiente carro sin perder el lugar.</p>}
        </fieldset>

        {lejos && (
          <div role="alert" className="flex gap-3 rounded-2xl border-2 border-warning/50 bg-warning-muted px-4 py-3">
            <TriangleAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
            <p>
              <strong>Tu teléfono dice que estás a {distanciaTexto(distancia ?? 0)} de Gina.</strong> Anótate cuando ya estés ahí,
              o escoge &ldquo;En otro lugar&rdquo;.
            </p>
          </div>
        )}
      </div>
      <SheetFooter>
        {error && (
          <p role="alert" className="font-bold text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" variant="signal" size="lg" className="w-full" disabled={pendiente || (!enGina && !lugar.trim() && !gps.punto)}>
          {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <HandIcon aria-hidden />}
          {lejos ? "Sí, ya estoy en Gina" : "Anotarme"}
        </Button>
      </SheetFooter>
    </form>
  )
}

function GpsBoton({
  gps,
  onLeer,
  texto,
}: {
  gps: { estado: "no" | "buscando" | "listo" | "error" }
  onLeer: () => void
  texto: string
}) {
  if (gps.estado === "listo") return <p className="text-[15px] font-bold text-success">✓ Ubicación lista</p>
  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" className="self-start" disabled={gps.estado === "buscando"} onClick={onLeer}>
        {gps.estado === "buscando" ? <Loader2Icon aria-hidden className="animate-spin" /> : <MapPinIcon aria-hidden />}
        {texto}
      </Button>
      {gps.estado === "error" && <p className="text-[15px] text-muted-foreground">No se pudo leer tu ubicación. Puedes seguir igual.</p>}
    </div>
  )
}
