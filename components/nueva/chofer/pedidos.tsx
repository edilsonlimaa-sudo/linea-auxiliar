"use client"

import { BellRing, ChevronRight, Flame, MessageCircle, Phone } from "lucide-react"
import Link from "next/link"

import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { whatsappDePedido } from "@/lib/contacto"
import type { PedidoAlCentro } from "@/lib/datos/inicio-chofer"
import { LIMITES, PROBABILIDAD, probables, TEMPERATURA, type Temperatura } from "@/lib/temperatura-pedidos"
import { cn } from "@/lib/utils"
import { iniciales } from "@/lib/viajes"

const personas = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)
const suma = (p: PedidoAlCentro[]) => p.reduce((n, x) => n + x.personas, 0)
const minutos = (m: number) => (m < 1 ? "hace un momento" : `hace ${Math.round(m)} min`)

// Rojo, naranja y azul: el color dice en un vistazo si vale la pena salir (R119)
const COLOR: Record<Temperatura, { punto: string; texto: string; fondo: string }> = {
  caliente: { punto: "bg-red-500", texto: "text-red-600 dark:text-red-400", fondo: "bg-red-500/10" },
  tibia: { punto: "bg-orange-400", texto: "text-orange-600 dark:text-orange-400", fondo: "bg-orange-400/10" },
  fria: { punto: "bg-sky-500", texto: "text-sky-700 dark:text-sky-400", fondo: "bg-sky-500/10" },
}

function porTemperatura(pedidos: PedidoAlCentro[]) {
  return (["caliente", "tibia", "fria"] as const).map((t) => ({ t, n: suma(pedidos.filter((p) => p.temperatura === t)) }))
}

/** La barrita: un tramo por temperatura, del largo de sus personas */
function Termometro({ pedidos, className }: { pedidos: PedidoAlCentro[]; className?: string }) {
  const total = suma(pedidos)
  return (
    <span aria-hidden className={cn("flex h-1.5 gap-0.5 overflow-hidden rounded-full", className)}>
      {porTemperatura(pedidos)
        .filter((x) => x.n > 0)
        .map((x) => (
          <span key={x.t} className={cn("h-full rounded-full", COLOR[x.t].punto)} style={{ width: `${(x.n / total) * 100}%` }} />
        ))}
    </span>
  )
}

/** "2 calientes de 5" o, sin calientes, "5 personas · pidieron hace rato" */
function resumen(pedidos: PedidoAlCentro[]) {
  const calientes = suma(pedidos.filter((p) => p.temperatura === "caliente"))
  const total = suma(pedidos)
  const nombre = `${calientes} ${calientes === 1 ? "caliente" : "calientes"}`
  if (calientes > 0) return calientes === total ? nombre : `${nombre} de ${total}`
  return `${personas(total)} · pidieron hace rato`
}

/**
 * R117 + R119: la franja del Inicio del chofer cuando hay pedidos de "Avísame" al Centro (de menos de una hora); sin
 * pedidos no ocupa lugar. Dice dónde ("Piden carro en Valle Grande", como "La lista en Gina") y qué tan caliente está:
 * cuenta las calientes y la barrita de colores; sin calientes, gris
 */
export function FaixaPedidos({ pedidos, compacta = false }: { pedidos: PedidoAlCentro[]; compacta?: boolean }) {
  if (pedidos.length === 0) return null
  const hayCalientes = pedidos.some((p) => p.temperatura === "caliente")
  const Icono = hayCalientes ? Flame : BellRing
  if (compacta) {
    return (
      <Link
        href="/n/chofer/pedidos"
        transitionTypes={["nav-forward"]}
        className={cn(
          "flex h-10 items-center gap-2 rounded-xl border px-3 text-sm transition-colors active:bg-muted",
          hayCalientes ? "border-red-500/40 bg-red-500/5" : "bg-card"
        )}
      >
        <Icono className={cn("size-4 shrink-0", hayCalientes ? "text-red-600" : "text-muted-foreground")} />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">Piden carro en Valle Grande</span>
          <span className="text-muted-foreground"> · {resumenCorto(pedidos)}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    )
  }
  return (
    <Link
      href="/n/chofer/pedidos"
      transitionTypes={["nav-forward"]}
      className={cn("flex items-center gap-3 rounded-3xl border p-4 transition-colors active:bg-muted", hayCalientes ? "border-red-500/40 bg-red-500/5" : "bg-card")}
    >
      <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", hayCalientes ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground")}>
        <Icono className="size-6" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="font-heading font-semibold">Piden carro en Valle Grande</p>
        <p className="text-sm text-muted-foreground">{hayCalientes ? `${resumen(pedidos)} · sal ahora` : `${resumen(pedidos)} · escríbeles antes de salir`}</p>
        <Termometro pedidos={pedidos} />
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  )
}

/** Arriba de la lista: cuántos probablemente viajen y de dónde sale (R119) */
export function ProbablesPedidos({ pedidos }: { pedidos: PedidoAlCentro[] }) {
  if (pedidos.length === 0) return null
  const total = suma(pedidos)
  const n = probables(pedidos)
  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-(--sombra-card)">
      <p className="font-heading text-lg font-semibold">{n === 0 ? "Puede que ya no viaje nadie" : `Probablemente viajen ${n} de ${total}`}</p>
      <Termometro pedidos={pedidos} className="h-2.5" />
      <ul className="grid grid-cols-3 gap-2 text-[13px]">
        {porTemperatura(pedidos).map(({ t, n: cuantas }) => (
          <li key={t} className={cn("flex flex-col rounded-2xl px-2.5 py-2", COLOR[t].fondo)}>
            <span className={cn("font-semibold", COLOR[t].texto)}>
              {cuantas} {cuantas === 1 ? TEMPERATURA[t].nombre.toLowerCase() : TEMPERATURA[t].plural}
            </span>
            <span className="text-muted-foreground">viaja {Math.round(PROBABILIDAD[t] * 10)} de 10</span>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-muted-foreground">
        Sale de lo que pasó antes: quien pidió hace menos de {LIMITES.caliente} min casi siempre sigue esperando; pasada la hora, nadie viajó.
        Si es tibia o fría, pregúntale antes de salir.
      </p>
    </section>
  )
}

/** R117 + R119: quienes pidieron el aviso, las calientes primero, con su color, Llamar y WhatsApp (el teléfono, solo conectado) */
export function ListaPedidos({ pedidos }: { pedidos: PedidoAlCentro[] }) {
  if (pedidos.length === 0) return null
  return (
    <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
      {pedidos.map((p) => {
        const telefono = p.telefono?.replace(/\D/g, "")
        const color = COLOR[p.temperatura]
        // Tibia o fría: primero preguntar si sigue esperando (el WhatsApp, más grande)
        const preguntar = p.temperatura !== "caliente"
        return (
          <li key={p.id} className="flex items-center gap-3 p-3">
            <div className="relative shrink-0">
              <ChoferAvatar chofer={{ nombre: p.nombre, iniciales: iniciales(p.nombre), fotoUrl: p.fotoUrl }} className="size-10" />
              <span aria-hidden className={cn("absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-card", color.punto)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{p.nombre}</p>
                {p.personas > 1 ? <Badge>+{p.personas - 1}</Badge> : null}
              </div>
              <p className="text-sm">
                <span className={cn("font-semibold", color.texto)}>{TEMPERATURA[p.temperatura].nombre}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · pidió {minutos(p.minutos)}
                  {p.avisado ? " · ya le avisamos, no apartó" : ""}
                </span>
              </p>
            </div>
            {telefono ? (
              <Button size="icon-sm" variant="outline" className="rounded-full" render={<a href={`tel:+${telefono}`} aria-label={`Llamar a ${p.nombre}`} />} nativeButton={false}>
                <Phone />
              </Button>
            ) : null}
            {telefono ? (
              <Button
                size={preguntar ? "sm" : "icon-sm"}
                variant="outline"
                className={cn("rounded-full border-success/40 text-success", preguntar && "bg-success/10")}
                render={<a href={whatsappDePedido(telefono)} target="_blank" rel="noreferrer" aria-label={`Preguntarle por WhatsApp a ${p.nombre} si sigue esperando`} />}
                nativeButton={false}
              >
                <MessageCircle />
                {preguntar ? "¿Sigues?" : null}
              </Button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/** En la franja compacta (con viajes) no caben las palabras: "1 🔥 de 4" o "4 hace rato" */
function resumenCorto(pedidos: PedidoAlCentro[]) {
  const calientes = suma(pedidos.filter((p) => p.temperatura === "caliente"))
  const total = suma(pedidos)
  if (calientes > 0) return calientes === total ? `${calientes} 🔥` : `${calientes} 🔥 de ${total}`
  return `${total} hace rato`
}
