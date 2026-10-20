"use client"

import { BellRingIcon, BusIcon, CheckIcon, Loader2Icon, MapPinIcon, PencilIcon, XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { HojaLugar } from "@/components/pasajero/hoja-lugar"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { avisarQueEspero, dejarDeEsperar } from "@/lib/acciones/pasajero"
import { hace } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { haciaEnFrase, iniciales, SENTIDOS, textoPersonas, type Sentido } from "@/lib/viajes"

/**
 * "Avísame cuando haya una" (R31): sin unidad con puesto en ese sentido, deja la espera (sentido + lugar) y pasa a la
 * página Esperando (§8). Es opcional: para mirar las unidades no hace falta.
 */
export function AvisameCuandoHaya({ sentido, recientes }: { sentido: Sentido; recientes: string[] }) {
  const router = useRouter()
  const [hoja, setHoja] = useState(false)
  return (
    <>
      <Button variant="signal" size="lg" className="w-full" onClick={() => setHoja(true)}>
        <BellRingIcon aria-hidden />
        Avísame cuando haya una
      </Button>
      <HojaLugar
        abierta={hoja}
        onCambiar={setHoja}
        titulo={`Te avisamos cuando haya una ${haciaEnFrase(sentido)}`}
        descripcion="Los choferes ven que alguien espera, y al apartar ya tienes tu lugar escrito."
        recientes={recientes}
        textoBoton="Avísame"
        personas={{ max: 4 }}
        onEnviar={async (datos) => {
          datos.set("sentido", sentido)
          const r = await avisarQueEspero(datos)
          if (r.ok) router.push("/esperando")
          return r
        }}
      />
    </>
  )
}

// Botones sobre el azul de la línea: borde y fondo claros translúcidos, como el botón "Menú" de la barra
const BOTON_SOBRE_AZUL =
  "border-2 border-header-foreground/35 bg-header-foreground/10 text-header-foreground hover:bg-header-foreground/20 hover:text-header-foreground"

/**
 * El estado de la espera, arriba de todo (§8 Esperando): "Esperando unidad" con un pulso, hacia dónde en grande, el
 * lugar y desde cuándo, y las dos acciones secundarias. La espera vence sola a las 2 h (R35).
 */
export function EstadoEspera({
  sentido,
  lugar,
  desde,
  recientes,
  personas = 1,
}: {
  sentido: Sentido
  lugar: string | null
  desde: string
  recientes: string[]
  personas?: number // cuántos van (R57)
}) {
  const [pendiente, iniciar] = useTransition()
  const [hoja, setHoja] = useState(false)

  return (
    <section aria-labelledby="titulo-esperando" className="relative overflow-hidden rounded-3xl bg-header p-5 text-header-foreground shadow-md">
      {/* Franja amarilla de la línea, como la barra de arriba */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-signal" />

      <div className="flex items-center gap-4">
        {/* Pulso: "estamos buscando" */}
        <span aria-hidden className="relative grid size-16 shrink-0 place-items-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal/30 motion-reduce:animate-none" />
          <span className="absolute inline-flex size-12 rounded-full bg-signal/25" />
          <span className="relative grid size-11 place-items-center rounded-full bg-signal text-signal-foreground">
            <BusIcon className="size-6" />
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-[0.12em] text-signal uppercase">Esperando unidad</p>
          <h1 id="titulo-esperando" className="text-[28px] leading-tight font-bold">
            <span className="block text-base font-normal opacity-90">Hacia</span>
            {SENTIDOS[sentido].destino}
          </h1>
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-1.5 rounded-2xl bg-header-foreground/10 p-3">
        <div className="flex items-start gap-2">
          <dt className="sr-only">Dónde estás</dt>
          <MapPinIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-signal" />
          <dd className="font-bold">{lugar ?? "Tu ubicación GPS"}</dd>
        </div>
        <div className="flex items-center gap-2 text-[15px] opacity-90">
          <dt className="sr-only">Desde</dt>
          <span aria-hidden className="size-5 shrink-0" />
          <dd>
            {personas > 1 ? `${textoPersonas(personas)} · ` : ""}Esperas desde {hace(desde)}
          </dd>
        </div>
      </dl>

      {/* En pantallas angostas se apilan en vez de cortar el texto */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" className={cn(BOTON_SOBRE_AZUL, "min-w-40 flex-1")} onClick={() => setHoja(true)}>
          <PencilIcon aria-hidden />
          Cambiar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(BOTON_SOBRE_AZUL, "min-w-40 flex-1")}
          disabled={pendiente}
          onClick={() => iniciar(async () => void (await dejarDeEsperar()))}
        >
          {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : <XIcon aria-hidden />}
          Dejar de esperar
        </Button>
      </div>

      <HojaLugar
        abierta={hoja}
        onCambiar={setHoja}
        titulo="¿Dónde estás?"
        descripcion={`Sigues esperando para ir ${haciaEnFrase(sentido)}.`}
        recientes={recientes}
        lugarInicial={lugar}
        textoBoton="Guardar"
        personas={{ max: 4, inicial: personas }}
        onEnviar={async (datos) => {
          datos.set("sentido", sentido)
          const r = await avisarQueEspero(datos)
          if (r.ok) setHoja(false)
          return r
        }}
      />
    </section>
  )
}

/** Los pasos (§8 Esperando): qué ya hizo, en qué está y qué sigue */
export function PasosEspera({ hayUnidad }: { hayUnidad: boolean }) {
  const pasos = [
    { texto: "Avisaste", estado: "hecho" },
    { texto: hayUnidad ? "¡Hay unidad!" : "Buscando unidad", estado: hayUnidad ? "hecho" : "actual" },
    { texto: "Apartas tu puesto", estado: hayUnidad ? "actual" : "pendiente" },
  ] as const
  return (
    <ol aria-label="Pasos" className="grid grid-cols-3 gap-2">
      {pasos.map((p, i) => (
        <li key={p.texto} aria-current={p.estado === "actual" ? "step" : undefined} className="flex flex-col items-center gap-1.5 text-center">
          <span className="flex w-full items-center">
            <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : p.estado === "pendiente" ? "bg-border" : "bg-primary")} />
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold",
                p.estado === "hecho" && "border-primary bg-primary text-primary-foreground",
                p.estado === "actual" && "border-primary bg-card text-primary",
                p.estado === "pendiente" && "border-border bg-card text-muted-foreground"
              )}
            >
              {p.estado === "hecho" ? <CheckIcon aria-hidden className="size-4" /> : i + 1}
            </span>
            <span className={cn("h-0.5 flex-1", i === pasos.length - 1 ? "bg-transparent" : pasos[i + 1].estado === "pendiente" ? "bg-border" : "bg-primary")} />
          </span>
          <span className={cn("text-sm leading-tight", p.estado === "pendiente" ? "text-muted-foreground" : "font-bold")}>{p.texto}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Esperan contigo (§8 Esperando, §6): las iniciales una junto a otra y, al abrir, nombre corto y desde cuándo.
 * Nunca el lugar.
 */
export function EsperanContigo({
  sentido,
  personas,
}: {
  sentido: Sentido
  personas: { nombre: string; personas: number; desde: string; soyYo: boolean }[]
}) {
  const otros = personas.filter((p) => !p.soyYo)
  // La demanda cuenta personas, no avisos (R57)
  const total = personas.reduce((n, p) => n + p.personas, 0)
  const visibles = personas.slice(0, 5)
  const resto = personas.length - visibles.length

  return (
    <section aria-labelledby="titulo-conmigo" className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4">
      <div className="flex items-center gap-3">
        <AvatarGroup>
          {visibles.map((p, i) => (
            <Avatar key={i} size="lg" className="size-11">
              <AvatarFallback className={cn("text-base font-bold", p.soyYo ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
                {p.soyYo ? "Tú" : iniciales(p.nombre)}
              </AvatarFallback>
            </Avatar>
          ))}
          {resto > 0 && <AvatarGroupCount className="size-11 text-base font-bold">+{resto}</AvatarGroupCount>}
        </AvatarGroup>
        <div className="min-w-0">
          <h2 id="titulo-conmigo" className="text-lg leading-tight font-bold">
            {otros.length === 0
              ? "Por ahora esperas solo"
              : otros.length === 1
                ? "1 persona más espera contigo"
                : `${otros.length} personas más esperan contigo`}
          </h2>
          <p className="text-[15px] text-muted-foreground">
            {total === 1 ? "1 persona espera" : `${total} personas esperan`} {haciaEnFrase(sentido)}. Los choferes lo ven.
          </p>
        </div>
      </div>

      {otros.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {otros.map((p, i) => (
            <li key={i}>
              <Badge variant="secondary" className="h-8 px-3 text-[15px]">
                {p.nombre}
                {p.personas > 1 && <span>+{p.personas - 1}</span>}
                <span className="font-normal opacity-80">· {hace(p.desde)}</span>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
