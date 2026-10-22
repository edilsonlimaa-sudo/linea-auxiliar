"use client"

import { BadgeCheckIcon, StarIcon, UsersIcon } from "lucide-react"
import { useState } from "react"

import { Estrellas, promedioTexto } from "@/components/estrellas"
import { Avatar } from "@/components/foto/avatar"
import { HojaCalificar } from "@/components/historial/hoja-calificar"
import { ChipAire } from "@/components/pasajero/chofer-resumen"
import { Button } from "@/components/ui/button"
import type { ChoferDeLaLinea, ViajePasajero } from "@/lib/datos/historial"
import { hace } from "@/lib/fechas"

/**
 * Choferes de la línea (R46): para conocerlos y escoger con confianza. Primero los que trabajan ahora.
 * Comentarios sin el nombre de quien opinó (R52); sin teléfonos (§6).
 */
export function ChoferesLinea({ choferes }: { choferes: ChoferDeLaLinea[] }) {
  const [calificando, setCalificando] = useState<ViajePasajero | null>(null)

  if (choferes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center">
        <UsersIcon aria-hidden className="size-10 text-muted-foreground" />
        <p className="text-base font-bold">Todavía no hay choferes verificados</p>
        <p className="text-muted-foreground">Cuando el administrador apruebe a los choferes de la línea, los vas a ver aquí.</p>
      </div>
    )
  }

  return (
    <>
      <ol className="flex flex-col gap-3">
        {choferes.map((c) => {
          const v = c.vehiculo
          return (
            <li key={c.id} className="flex flex-col gap-4 rounded-2xl border-2 bg-card p-4">
              <div className="flex items-center gap-4">
                <Avatar url={c.fotoUrl} nombre={c.nombre} className="size-16 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="text-base leading-tight font-bold">{c.nombre}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1 font-bold text-success">
                      <BadgeCheckIcon aria-hidden className="size-4" />
                      Verificado
                    </span>
                    {c.trabajando && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-muted px-2 py-0.5 text-sm font-bold text-success">
                        <span aria-hidden className="size-2 rounded-full bg-success" />
                        Trabajando ahora
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {v && (
                <div className="flex flex-col gap-2">
                  {v.fotoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- enlace firmado de Supabase Storage (R54)
                    <img src={v.fotoUrl} alt={`Carro de ${c.nombre}`} className="aspect-video w-full rounded-2xl object-cover" />
                  )}
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="rounded-md border-2 border-foreground/70 px-1.5 font-mono font-bold tracking-wider">{v.placa}</span>
                    <span className="text-muted-foreground">
                      {[v.modelo, v.color].filter(Boolean).join(" · ")}
                      {v.unidad && ` · Unidad ${v.unidad}`}
                    </span>
                    {v.aire_acondicionado && <ChipAire />}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {c.promedio !== null ? (
                  <p className="flex items-center gap-2">
                    <Estrellas valor={c.promedio} />
                    <span className="font-bold">{promedioTexto(c.promedio)}</span>
                    <span className="text-muted-foreground">({c.cantidad === 1 ? "1 calificación" : `${c.cantidad} calificaciones`})</span>
                  </p>
                ) : (
                  <p className="text-muted-foreground">Todavía sin calificaciones</p>
                )}
                {c.comentarios.map((k, i) => (
                  <blockquote key={i} className="rounded-xl border-l-4 border-signal bg-muted px-3 py-2">
                    <p>“{k.comentario}”</p>
                    <footer className="mt-1 text-sm text-muted-foreground">
                      {k.estrellas} ★ · {hace(k.creadoEn)}
                    </footer>
                  </blockquote>
                ))}
              </div>

              {c.porCalificar && (
                <Button variant="outline" className="self-start" onClick={() => setCalificando(c.porCalificar)}>
                  <StarIcon aria-hidden />
                  Calificar tu viaje con {c.nombre.split(" ")[0]}
                </Button>
              )}
            </li>
          )
        })}
      </ol>
      <HojaCalificar viaje={calificando} onCerrar={() => setCalificando(null)} volver="choferes" />
    </>
  )
}
