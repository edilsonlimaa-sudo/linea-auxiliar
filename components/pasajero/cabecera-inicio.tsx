import { CheckIcon, ChevronRightIcon } from "lucide-react"
import Link from "next/link"

import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar"
import { LineaAhora } from "@/components/pasajero/linea-ahora"
import { Badge } from "@/components/ui/badge"
import type { ChoferEnPausa, ChoferEnServicio, ViajeConChofer } from "@/lib/datos/inicio-pasajero"
import { textoVuelta } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { iniciales, SENTIDOS, type Sentido } from "@/lib/viajes"

// El sentido va en la dirección (?hacia=centro): así sobrevive al refresco en vivo y a volver atrás
export const HACIA: Record<Sentido, string> = { vg_a_centro: "centro", centro_a_vg: "valle" }
export const sentidoDeHacia = (valor: unknown): Sentido | null =>
  valor === "centro" ? "vg_a_centro" : valor === "valle" ? "centro_a_vg" : null

/**
 * El bloque principal de Inicio (docs/especificacion.md §8): la pregunta de la pantalla, "¿Hacia dónde vas?", con los
 * dos sentidos ahí mismo, y abajo quiénes trabajan ahora (sus caras): tocarla abre "La línea ahora".
 */
export function CabeceraInicio({
  saludo,
  sentido,
  unidades,
  choferes,
  enPausa,
  viajes,
}: {
  saludo: string
  sentido: Sentido
  unidades: Record<Sentido, number>
  choferes: ChoferEnServicio[]
  enPausa: ChoferEnPausa[] // R60
  viajes: ViajeConChofer[] // los abiertos de toda la línea, para "La línea ahora"
}) {
  const visibles = choferes.slice(0, 4)
  const resto = choferes.length - visibles.length
  // Sin nadie trabajando, la franja adelanta quién vuelve primero (R60)
  const vuelve = choferes.length === 0 ? enPausa.find((c) => c.vuelveEn) : undefined

  return (
    <section aria-labelledby="titulo-hacia" className="relative overflow-hidden rounded-2xl bg-header text-header-foreground shadow-md">
      {/* Franja amarilla de la línea, como la barra de arriba */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-signal" />

      <div className="flex flex-col gap-4 p-4 pt-6">
        <div>
          <p className="text-sm opacity-90">{saludo}</p>
          <h1 id="titulo-hacia" className="text-xl leading-tight font-bold">
            ¿Hacia dónde vas?
          </h1>
        </div>

        <nav aria-label="Sentido" className="grid grid-cols-2 gap-2">
          {(Object.keys(SENTIDOS) as Sentido[]).map((s) => {
            const activo = s === sentido
            const n = unidades[s]
            return (
              <Link
                key={s}
                href={`/inicio?hacia=${HACIA[s]}`}
                replace
                scroll={false}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex min-h-20 flex-col justify-between gap-1 rounded-2xl border-2 p-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  activo
                    ? "border-signal bg-card text-card-foreground shadow-md"
                    : "border-header-foreground/30 bg-header-foreground/10 text-header-foreground hover:bg-header-foreground/20"
                )}
              >
                <span className="flex items-center gap-1.5 text-base leading-tight font-bold">
                  {activo && <CheckIcon aria-hidden className="size-5 shrink-0 text-primary" />}
                  {SENTIDOS[s].corto}
                </span>
                {activo ? (
                  <Badge variant={n > 0 ? "success" : "secondary"}>{n === 0 ? "Sin unidades" : n === 1 ? "1 unidad" : `${n} unidades`}</Badge>
                ) : (
                  <span className="text-sm opacity-90">{n === 0 ? "Sin unidades" : n === 1 ? "1 unidad" : `${n} unidades`}</span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* ¿Está trabajando la línea? En una franja, con las caras; al tocarla, qué hace cada chofer */}
      <LineaAhora
        choferes={choferes}
        enPausa={enPausa}
        viajes={viajes}
        sentido={sentido}
        className="flex min-h-12 w-full items-center gap-3 border-t border-header-foreground/15 bg-header-foreground/10 px-4 py-2.5 text-left font-bold outline-none hover:bg-header-foreground/15 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-inset"
      >
        {choferes.length > 0 ? (
          <AvatarGroup className="*:data-[slot=avatar]:ring-header">
            {visibles.map((c) => (
              <Avatar key={c.id} className="size-9">
                {c.fotoUrl && <AvatarImage src={c.fotoUrl} alt="" />}
                <AvatarFallback className="bg-secondary text-sm font-bold text-secondary-foreground">{iniciales(c.nombre)}</AvatarFallback>
              </Avatar>
            ))}
            {resto > 0 && <AvatarGroupCount className="size-9 text-sm font-bold">+{resto}</AvatarGroupCount>}
          </AvatarGroup>
        ) : (
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-header-foreground/50" />
        )}
        <span className="min-w-0 flex-1 leading-tight">
          {choferes.length === 0
            ? "Ningún chofer trabajando ahora"
            : choferes.length === 1
              ? "1 chofer trabajando"
              : `${choferes.length} choferes trabajando`}
          <span className="block text-sm font-normal opacity-90">
            {vuelve ? `${vuelve.nombre.split(" ")[0]} ${textoVuelta(vuelve.vuelveEn)}` : "Qué hace cada chofer y qué viene después"}
          </span>
        </span>
        <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-signal" />
      </LineaAhora>
    </section>
  )
}
