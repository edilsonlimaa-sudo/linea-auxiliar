"use client"

import { ChevronRight, Map as MapIcon, Hand, Loader2, MapPin, Route, TimerReset, Users } from "lucide-react"
import * as React from "react"

import { AppHeader } from "@/components/nueva/app/app-header"
import { MapaCarro } from "@/components/nueva/pasajero/mapa-carro"
import { ChoferAvatar, personasLabel } from "@/components/nueva/pasajero/comunes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/nueva/ui/avatar"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/nueva/ui/drawer"
import { Input } from "@/components/nueva/ui/input"
import { estoyEnLista, meFui, sigoEnLista } from "@/lib/acciones/pasajero"
import { MOTIVOS_SALIDA, OPCION_ME_FUI } from "@/lib/motivos-salida"
import type { FilaVista, MiListaVista, UnidadVista } from "@/lib/nueva/vistas"
import { tarifaEn, textoTarifa } from "@/lib/tarifas"
import { cn } from "@/lib/utils"

const VALE_MS = 30 * 60_000 // el lugar vale 30 min (R62)
const AVISAR_MS = 10 * 60_000 // a los 20 min, "¿Sigues ahí?" (faltan 10)

const hora = (iso: string | number) =>
  new Intl.DateTimeFormat("es-VE", { hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(new Date(iso))

/** La hora del celular cada 30 s (en el servidor, 0: nada que dependa de la hora) */
function useAhora() {
  const suscribir = React.useCallback((avisar: () => void) => {
    const id = window.setInterval(avisar, 30_000)
    return () => window.clearInterval(id)
  }, [])
  return React.useSyncExternalStore(suscribir, () => Math.floor(Date.now() / 30_000) * 30_000, () => 0)
}

/**
 * A Valle Grande (§5.17): una sola pantalla, anotado o no. Sin anotarse: cuántos esperan, los carros que vienen y Anotarme.
 * Anotado (todavía no es un viaje: Mi viaje empieza al montarse): su lugar, cuánto vale, los carros que vienen y Me fui. La lista completa se abre
 * en una hoja desde abajo.
 */
export function PantallaValle({
  mio,
  filas,
  carros,
  titulo,
  backHref,
}: {
  mio: MiListaVista | null
  filas: FilaVista[]
  carros: UnidadVista[]
  titulo: string
  backHref?: string
}) {
  return (
    <>
      <AppHeader title={titulo} backHref={backHref} />
      <div className={cn("flex flex-1 flex-col gap-4 p-4", backHref && "pb-[max(1rem,env(safe-area-inset-bottom))]")}>
        <div>
          <p className="text-sm text-muted-foreground">Centro → Valle Grande</p>
          <h2 className="font-heading text-2xl font-semibold">La lista en Gina</h2>
        </div>

        {mio ? <MiLugar mio={mio} filas={filas} /> : <CuantosEsperan filas={filas} />}
        {mio && !mio.diceQueSubio ? <SigoAquiCard venceEn={mio.venceEn} /> : null}

        <section className="flex flex-col gap-3">
          <h3 className="font-heading text-lg font-semibold">Carros que vienen</h3>
          <CarrosQueVienen carros={carros} />
        </section>

        <div className="mt-auto flex flex-col gap-2 pt-2">{mio ? <MeFuiDrawer /> : <AnotarmeCta />}</div>
      </div>
    </>
  )
}

/** Sin anotarse: cuántos esperan; tocarlo abre la lista */
function CuantosEsperan({ filas }: { filas: FilaVista[] }) {
  const esperan = filas.reduce((n, f) => n + f.personas, 0)
  return (
    <HojaLista filas={filas} className="flex w-full items-center gap-3 rounded-3xl border bg-card p-4 text-left transition-colors active:bg-muted">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Users className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading font-semibold">
          {esperan === 0 ? "Nadie esperando" : `${esperan === 1 ? "1 persona" : `${esperan} personas`} esperando`}
        </p>
        <p className="text-sm text-muted-foreground">El orden es por la hora en que cada uno se anota.</p>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </HojaLista>
  )
}

/** Anotado: mi lugar en la lista */
function MiLugar({ mio, filas }: { mio: MiListaVista; filas: FilaVista[] }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{mio.diceQueSubio ? "Te montaste" : "En la lista"}</Badge>
        <span className="text-sm text-muted-foreground">{personasLabel(mio.personas)}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 flex-col items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <span className="font-heading text-4xl leading-none font-semibold tabular-nums">{mio.posicion}</span>
          <span className="text-[10px] font-medium tracking-wide uppercase opacity-80">lugar</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-semibold">
            {mio.delante === 0 ? "Eres el siguiente" : mio.delante === 1 ? "1 persona antes que tú" : `${mio.delante} personas antes que tú`}
          </p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {mio.lugar}
          </p>
        </div>
      </div>
      {!mio.enGina ? <p className="text-sm text-muted-foreground">El carro te guarda puesto y te recoge al pasar.</p> : null}
      <HojaLista
        filas={filas}
        className="flex w-full items-center justify-between rounded-2xl bg-muted/60 px-3 py-2 text-sm font-medium transition-colors active:bg-muted"
      >
        Ver la lista completa
        <ChevronRight className="size-4 text-muted-foreground" />
      </HojaLista>
    </section>
  )
}

/** La lista completa (R63) en una hoja desde abajo, de alto fijo (la lista corre por dentro); children = lo que se toca para abrirla */
function HojaLista({ filas, className, children }: { filas: FilaVista[]; className: string; children: React.ReactNode }) {
  const [abierta, setAbierta] = React.useState(false)
  return (
    <Drawer open={abierta} onOpenChange={setAbierta} showSwipeHandle>
      <DrawerTrigger className={className}>{children}</DrawerTrigger>
      {/* El alto fijo va en la lista, no en la hoja: la hoja mide sola su alto, y de eso depende el gesto para bajarla */}
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          <DrawerTitle className="font-heading text-xl">La lista en Gina</DrawerTitle>
          <DrawerDescription>Parada Gina, Centro → Valle Grande. El orden es por la hora en que cada uno se anotó.</DrawerDescription>
        </DrawerHeader>
        <div className="h-[55dvh] overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <FilaLista filas={filas} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/** Cuánto vale el lugar y "Sigo aquí" (R62); faltando 10 min se vuelve el aviso "¿Sigues ahí?" */
function SigoAquiCard({ venceEn }: { venceEn: string }) {
  const ahora = useAhora()
  const [pendiente, iniciar] = React.useTransition()
  const [error, setError] = React.useState<string>()
  const restante = ahora > 0 ? new Date(venceEn).getTime() - ahora : VALE_MS
  const urgente = restante <= AVISAR_MS
  const minutos = Math.max(0, Math.ceil(restante / 60_000))
  const fraccion = Math.min(1, Math.max(0, restante / VALE_MS))

  return (
    <section className={cn("flex flex-col gap-3 rounded-3xl border bg-card p-4", urgente && "border-amber-400 bg-amber-50 dark:bg-amber-950/30")}>
      <div className="flex items-start gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl", urgente ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary")}>
          {urgente ? <TimerReset className="size-5" /> : <Hand className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          {urgente ? (
            <>
              <p className="font-medium">¿Sigues ahí?</p>
              <p className="text-sm text-muted-foreground">Si no respondes, a las {hora(venceEn)} sales de la lista.</p>
            </>
          ) : (
            <>
              <p className="font-medium">Tu lugar vale {minutos} min más</p>
              <p className="text-sm text-muted-foreground">Hasta las {hora(venceEn)}. Renuévalo cuando quieras.</p>
            </>
          )}
        </div>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fraccion * 100)}
        aria-label="Tiempo que le queda a tu lugar"
      >
        <div className={cn("h-full rounded-full transition-[width]", urgente ? "bg-amber-500" : "bg-primary")} style={{ width: `${fraccion * 100}%` }} />
      </div>
      <Button
        size="lg"
        variant={urgente ? "default" : "outline"}
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            const r = await sigoEnLista()
            setError(r.error)
          })
        }
      >
        {pendiente ? <Loader2 className="animate-spin" /> : null}
        {urgente ? "Sí, sigo aquí" : "Sigo aquí: 30 min más"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}

/** Me fui (R62): un toque dice cómo se va */
function MeFuiDrawer() {
  const [pendiente, iniciar] = React.useTransition()
  const [error, setError] = React.useState<string>()
  return (
    <Drawer showSwipeHandle>
      <DrawerTrigger render={<Button variant="ghost" size="lg" className="text-destructive" />}>Me fui</DrawerTrigger>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <DrawerHeader>
          <DrawerTitle className="font-heading text-xl">¿Cómo te vas?</DrawerTitle>
          <DrawerDescription>Sales de la lista. Si vuelves, te anotas otra vez al final.</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-2 px-4 pb-2">
          {MOTIVOS_SALIDA.map((m) => (
            <Button
              key={m}
              variant="outline"
              size="lg"
              disabled={pendiente}
              onClick={() =>
                iniciar(async () => {
                  const r = await meFui(m)
                  setError(r.error)
                })
              }
            >
              {OPCION_ME_FUI[m]}
            </Button>
          ))}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <div className="p-4 pt-2">
          <DrawerClose render={<Button variant="ghost" size="lg" className="w-full" />}>No, sigo esperando</DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/** Los carros hacia Valle Grande (R63, R67), con el aviso de que solo estos son de la línea hoy */
/** Cuándo pasa por Gina, en una línea: "12 min · a las 12:14 a. m.", "Ya · en Gina", "Ya salió" */
function cuandoPasa(u: UnidadVista) {
  const que = u.hora
    ? `a las ${u.hora}`
    : u.estado === "en_parada"
      ? "en Gina"
      : u.estado === "llegando"
        ? "llegando a Gina"
        : u.estado === "en_ruta"
          ? "Ya salió"
          : "en cualquier momento" // pasó la hora que dijo y todavía no avisa que llega
  return u.minutos ? `${u.minutos} · ${que}` : que
}

/** Los carros del tramo (§5.17), limpios: quién, cuándo pasa por Gina y cuántos puestos le quedan */
export function CarrosQueVienen({ carros }: { carros: UnidadVista[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Estos son los carros de la Línea hoy. Si un chofer que no aparece aquí te pregunta si estás en la lista, no está trabajando con la
        Línea.
      </p>
      {carros.length === 0 ? (
        <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Ningún carro va hacia Valle Grande ahora. Esta pantalla se actualiza sola.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
          {carros.map((u) => (
            <li key={u.id}>
              {/* Tocar el carro abre el mapa: por dónde viene (R41) */}
              <MapaCarro
                choferId={u.chofer.id}
                chofer={u.chofer.nombre}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors active:bg-muted"
              >
                <ChoferAvatar chofer={u.chofer} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.chofer.nombre}</p>
                  <p className="truncate text-sm text-muted-foreground">{cuandoPasa(u)}</p>
                </div>
                <span className={cn("shrink-0 text-sm font-medium", u.libres > 0 ? "text-primary" : "text-muted-foreground")}>
                  {u.libres > 0 ? `${u.libres} ${u.libres === 1 ? "libre" : "libres"}` : "Lleno"}
                </span>
                <MapIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </MapaCarro>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** La lista completa en Gina (R63), con la mía destacada */
export function FilaLista({ filas }: { filas: FilaVista[] }) {
  if (filas.length === 0) {
    return <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nadie está en la lista ahora.</p>
  }
  return (
    <ol className="divide-y overflow-hidden rounded-3xl border bg-card">
      {filas.map((f) => (
        <li key={f.id} className={cn("flex items-center gap-3 p-3", f.esMio && "bg-primary/5")}>
          <span className="w-6 text-center font-heading font-semibold text-muted-foreground tabular-nums">{f.posicion}</span>
          <Avatar className="size-10">
            {f.fotoUrl && !f.esMio ? <AvatarImage src={f.fotoUrl} alt="" /> : null}
            <AvatarFallback className={cn("font-heading font-semibold", f.esMio ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {f.iniciales}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate font-medium", f.esMio && "text-primary")}>{f.nombre}</p>
            <p className="truncate text-sm text-muted-foreground">
              {personasLabel(f.personas)} · {f.lugar}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{hora(f.creadaEn)}</span>
        </li>
      ))}
    </ol>
  )
}

/** "Anotarme en la lista" (R62): dónde está (Gina u otro punto escrito, sin GPS, R26) y cuántos van */
export function AnotarmeCta() {
  const [open, setOpen] = React.useState(false)
  const [lugar, setLugar] = React.useState<"gina" | "otro">("gina")
  const [otro, setOtro] = React.useState("")
  const [cuantos, setCuantos] = React.useState(1)
  const [error, setError] = React.useState<string | null>(null)
  const [pendiente, iniciar] = React.useTransition()
  // R80: el pasaje solo si rige la tarifa especial
  const [tarifa] = React.useState(() => tarifaEn(new Date()))

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (lugar === "otro" && !otro.trim()) return setError("Dinos en qué punto de la ruta estás.")
    iniciar(async () => {
      // Si sale bien, la acción lleva a /n (Mi viaje)
      const r = await estoyEnLista({
        enGina: lugar === "gina",
        lugar: lugar === "gina" ? null : otro.trim(),
        lat: null,
        lng: null,
        personas: cuantos,
        distanciaM: null,
      })
      if (r?.error) setError(r.error)
    })
  }

  const opciones = [
    { id: "gina" as const, titulo: "En Gina", detalle: "La parada del Centro", icon: MapPin },
    { id: "otro" as const, titulo: "En otro punto", detalle: "Sobre la ruta del carro", icon: Route },
  ]

  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <Button size="lg" onClick={() => setOpen(true)}>
        Anotarme en la lista
      </Button>
      <DrawerContent className="sm:mx-auto sm:max-w-[430px]">
        <form onSubmit={enviar} className="flex flex-col">
          <DrawerHeader>
            <DrawerTitle className="font-heading text-xl">Anotarme en la lista</DrawerTitle>
            <DrawerDescription>Tu lugar es por la hora en que te anotas. Anótate cuando ya estés esperando.</DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-5 px-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="font-medium">¿Dónde estás?</legend>
              <div className="grid grid-cols-2 gap-2">
                {opciones.map(({ id, titulo, detalle, icon: Icon }) => {
                  const activo = lugar === id
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => (setLugar(id), setError(null))}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors",
                        activo ? "border-primary bg-primary/10 text-primary" : "bg-input/30 hover:bg-muted"
                      )}
                    >
                      <Icon className="size-5" />
                      <span className="font-medium">{titulo}</span>
                      <span className={cn("text-xs", activo ? "text-primary/80" : "text-muted-foreground")}>{detalle}</span>
                    </button>
                  )
                })}
              </div>
              {lugar === "otro" ? (
                <div className="flex flex-col gap-1">
                  <Input
                    value={otro}
                    onChange={(e) => (setOtro(e.target.value), error && setError(null))}
                    maxLength={60}
                    placeholder="Ej.: Plaza del Indio"
                    aria-label="En qué punto de la ruta"
                    aria-invalid={error ? true : undefined}
                    autoComplete="off"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">Un punto de la ruta: el carro te guarda puesto y te recoge al pasar.</p>
                </div>
              ) : null}
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="font-medium">¿Cuántos van?</legend>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="lg"
                    variant={cuantos === n ? "default" : "outline"}
                    aria-pressed={cuantos === n}
                    onClick={() => setCuantos(n)}
                    className="font-heading text-base"
                  >
                    {n === 1 ? "Solo yo" : n}
                  </Button>
                ))}
              </div>
              {cuantos > 1 ? <p className="text-xs text-muted-foreground">Suben juntos: si no caben todos, esperan el siguiente carro.</p> : null}
            </fieldset>

            {tarifa.tipo !== "normal" ? (
              <p className="rounded-2xl bg-secondary px-3 py-2 text-sm">
                Pasaje: <strong>{textoTarifa(tarifa)}</strong>
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 p-4">
            <Button type="submit" size="lg" disabled={pendiente}>
              {pendiente ? <Loader2 className="animate-spin" /> : null}
              Anotarme
            </Button>
            <DrawerClose render={<Button type="button" variant="ghost" size="lg" />}>Cancelar</DrawerClose>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
