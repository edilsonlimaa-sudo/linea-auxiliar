"use client"

import { ChevronRightIcon, ClockIcon, MapPinIcon, MessageCircleIcon, NavigationIcon, UsersIcon } from "lucide-react"
import { useState } from "react"

import { Avatar } from "@/components/foto/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { EsperaParaChofer } from "@/lib/datos/inicio-chofer"
import { hace } from "@/lib/fechas"
import { conAcompanantes, haciaEnFrase, SENTIDOS, sumaPersonas, type Sentido } from "@/lib/viajes"

/**
 * Quién espera (R31, §6): el chofer conectado ve nombre corto, foto, cuántos van, dónde y desde cuándo, y puede
 * escribirle por WhatsApp (la app no manda mensajes: abre el chat con un saludo escrito). Desconectado no ve a nadie.
 */
export function QuienEspera({
  personas,
  conectado,
  chofer,
  className,
}: {
  personas: EsperaParaChofer[]
  conectado: boolean
  chofer: string // su nombre, para el saludo
  className?: string
}) {
  const [abierta, setAbierta] = useState(false)
  if (!conectado) {
    return <p className="text-[15px] text-muted-foreground">Conéctate para ver quién espera y poder escribirle.</p>
  }
  if (personas.length === 0) return null
  const total = sumaPersonas(personas)

  return (
    <>
      <Button variant="outline" className={className ?? "w-full"} onClick={() => setAbierta(true)}>
        <UsersIcon aria-hidden />
        Ver quién espera ({total})
        <ChevronRightIcon aria-hidden className="ml-auto" />
      </Button>
      <Sheet open={abierta} onOpenChange={setAbierta}>
        <SheetContent side="bottom" className="mx-auto max-h-[90svh] max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Quién espera</SheetTitle>
            <SheetDescription className="text-base">Escríbeles por WhatsApp si hace falta. Apartan ellos desde la app.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 px-5 pb-6">
            {(Object.keys(SENTIDOS) as Sentido[])
              .filter((s) => personas.some((p) => p.sentido === s))
              .map((s) => {
                const deEste = personas.filter((p) => p.sentido === s)
                return (
                  <section key={s} aria-labelledby={`espera-${s}`} className="flex flex-col gap-2">
                    <h3 id={`espera-${s}`} className="text-lg font-bold">
                      Para ir {haciaEnFrase(s)} <span className="font-normal text-muted-foreground">({sumaPersonas(deEste)})</span>
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {deEste.map((p) => (
                        <Fila key={p.id} espera={p} chofer={chofer} />
                      ))}
                    </ul>
                  </section>
                )
              })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function Fila({ espera: e, chofer }: { espera: EsperaParaChofer; chofer: string }) {
  const digitos = e.telefono?.replace(/\D/g, "")
  const saludo = encodeURIComponent(
    `Hola, soy ${chofer.split(" ")[0]}, chofer de la Línea Auxiliar. Vi que esperas para ir ${haciaEnFrase(e.sentido)}${e.lugar ? ` en ${e.lugar}` : ""}.`
  )
  const gps = e.lat !== null && e.lng !== null ? `${e.lat},${e.lng}` : null
  return (
    <li className="flex flex-col gap-2.5 rounded-2xl border-2 bg-card p-3">
      <div className="flex items-center gap-3">
        <Avatar url={e.fotoUrl} nombre={e.nombre ?? "Pasajero"} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg leading-tight font-bold">{conAcompanantes(e.nombre ?? "Pasajero", e.personas)}</p>
          <p className="flex items-start gap-1 text-[15px]">
            <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className={e.lugar ? "font-bold" : "text-muted-foreground"}>{e.lugar ?? "Solo compartió su GPS"}</span>
          </p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <ClockIcon aria-hidden className="size-3.5" />
            Espera {hace(e.creado_en)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {digitos && (
          <a
            href={`https://wa.me/${digitos}?text=${saludo}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "whatsapp", size: "sm", className: "flex-1" })}
          >
            <MessageCircleIcon aria-hidden /> WhatsApp
          </a>
        )}
        {gps && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${gps}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm", className: "flex-1" })}
          >
            <NavigationIcon aria-hidden /> Cómo llegar
          </a>
        )}
      </div>
    </li>
  )
}
