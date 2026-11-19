"use client"

import { BellRing, ChevronRight, MessageCircle, Phone } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { whatsappDePedido } from "@/lib/contacto"
import type { PedidoAlCentro } from "@/lib/datos/inicio-chofer"
import { hace } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { iniciales } from "@/lib/viajes"

const personas = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)
const suma = (p: PedidoAlCentro[]) => p.reduce((n, x) => n + x.personas, 0)

/**
 * R117: la franja del Inicio del chofer cuando hay pedidos de "Avísame" al Centro; sin pedidos no ocupa lugar. Como "La
 * lista en Gina", dice dónde esperan: "Esperando en Valle Grande · N personas"
 */
export function FaixaPedidos({ pedidos, compacta = false }: { pedidos: PedidoAlCentro[]; compacta?: boolean }) {
  if (pedidos.length === 0) return null
  const cuantas = personas(suma(pedidos))
  if (compacta) {
    return (
      <Link
        href="/n/chofer/pedidos"
        transitionTypes={["nav-forward"]}
        className="flex h-10 items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 text-sm transition-colors active:bg-muted"
      >
        <BellRing className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">Esperando en Valle Grande</span>
          <span className="text-muted-foreground"> · {cuantas}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    )
  }
  return (
    <Link
      href="/n/chofer/pedidos"
      transitionTypes={["nav-forward"]}
      className="flex items-center gap-3 rounded-3xl border border-primary/40 bg-primary/5 p-4 transition-colors active:bg-muted"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <BellRing className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-heading font-semibold">Esperando en Valle Grande</p>
        <p className="text-sm text-muted-foreground">{cuantas} piden un carro al Centro · escríbeles</p>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  )
}

/** R117: quienes pidieron el aviso, en orden, con Llamar y WhatsApp (el teléfono, solo conectado) */
export function ListaPedidos({ pedidos }: { pedidos: PedidoAlCentro[] }) {
  // "hace N min" depende de la hora del celular: solo en el navegador
  const montado = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  if (pedidos.length === 0) return null
  return (
    <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
      {pedidos.map((p) => {
        const telefono = p.telefono?.replace(/\D/g, "")
        return (
          <li key={p.id} className={cn("flex items-center gap-3 p-3")}>
            <ChoferAvatar chofer={{ nombre: p.nombre, iniciales: iniciales(p.nombre), fotoUrl: p.fotoUrl }} className="size-10" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{p.nombre}</p>
                {p.personas > 1 ? <Badge>+{p.personas - 1}</Badge> : null}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {montado ? `Pidió ${hace(p.pedidoEn)}` : "Pidió aviso"}
                {p.avisado ? " · ya le avisamos" : ""}
              </p>
            </div>
            {telefono ? (
              <Button size="icon-sm" variant="outline" className="rounded-full" render={<a href={`tel:+${telefono}`} aria-label={`Llamar a ${p.nombre}`} />} nativeButton={false}>
                <Phone />
              </Button>
            ) : null}
            {telefono ? (
              <Button
                size="icon-sm"
                variant="outline"
                className="rounded-full border-success/40 text-success"
                render={<a href={whatsappDePedido(telefono)} target="_blank" rel="noreferrer" aria-label={`Escribirle por WhatsApp a ${p.nombre}`} />}
                nativeButton={false}
              >
                <MessageCircle />
              </Button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
