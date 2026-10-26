import { TriangleAlertIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EnVivo } from "@/components/en-vivo"
import { Avatar } from "@/components/foto/avatar"
import { cargarHistorialListaAdmin, cargarListaGinaAdmin, type MotivoSalida } from "@/lib/datos/lista-gina"
import { hace, hora, inicioDelDia } from "@/lib/fechas"
import { distanciaTexto } from "@/lib/mapa"
import { exigirAdmin } from "@/lib/sesion"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Lista hacia Valle Grande · Administración" }

const LEJOS_M = 300 // como en el aviso del pasajero (R62)

const PERIODOS = { hoy: "Hoy", ayer: "Ayer", "7d": "7 días" } as const
type Periodo = keyof typeof PERIODOS

const MOTIVOS: Record<MotivoSalida, { texto: string; clase: string }> = {
  subio: { texto: "Subieron", clase: "bg-success-muted text-success" },
  se_fue: { texto: "Se fueron", clase: "bg-muted text-foreground" },
  vencida: { texto: "Vencieron", clase: "bg-warning-muted text-warning" },
  no_estaba: { texto: "No estaban", clase: "bg-destructive/10 text-destructive" },
  cancelo: { texto: "Cancelaron", clase: "bg-muted text-muted-foreground" },
}

/** "12 min" / "1 h 05 min" */
function duracion(desde: string, hasta: string | null) {
  if (!hasta) return null
  const min = Math.max(0, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 60_000))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`
}

// Lista hacia Valle Grande (docs/especificacion.md §5.17): quién espera ahora, en orden, y quién salió y por qué
export default async function PaginaListaGina({ searchParams }: PageProps<"/admin/lista-gina">) {
  await exigirAdmin()
  const { periodo: p } = await searchParams
  const periodo: Periodo = p === "ayer" || p === "7d" ? p : "hoy"
  const desde = inicioDelDia(periodo === "ayer" ? 1 : periodo === "7d" ? 6 : 0)
  const hasta = periodo === "ayer" ? inicioDelDia(0) : undefined

  const [lista, historial] = await Promise.all([cargarListaGinaAdmin(), cargarHistorialListaAdmin(desde, hasta)])
  const enGina = lista.filter((e) => e.enGina).reduce((n, e) => n + e.personas, 0)
  const enCamino = lista.filter((e) => !e.enGina).reduce((n, e) => n + e.personas, 0)
  const porMotivo = (Object.keys(MOTIVOS) as MotivoSalida[])
    .map((m) => ({ m, n: historial.filter((h) => h.motivo === m).length }))
    .filter((x) => x.n > 0)
  // Lo que más se quiere medir: cuánta gente se lleva la van (R62)
  const enLaVan = historial.filter((h) => h.meFui === "van").length

  return (
    <div className="flex flex-col gap-8">
      <EnVivo />
      <section aria-labelledby="titulo-ahora" className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 id="titulo-ahora" className="text-xl leading-tight font-bold">
            Lista hacia Valle Grande
          </h1>
          <p className="text-muted-foreground">Centro → Valle Grande, por orden de llegada. Se actualiza sola.</p>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 bg-card px-4 py-3">
            <p className="text-xl font-bold tabular-nums">{enGina}</p>
            <p className="text-sm text-muted-foreground">esperando en Gina</p>
          </div>
          <div className="rounded-2xl border-2 bg-card px-4 py-3">
            <p className="text-xl font-bold tabular-nums">{enCamino}</p>
            <p className="text-sm text-muted-foreground">en otro lugar del camino</p>
          </div>
        </div>

        {lista.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed px-4 py-8 text-center text-muted-foreground">Nadie en la lista ahora.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {lista.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl border-2 bg-card p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{e.posicion}</span>
                <Avatar url={e.fotoUrl} nombre={e.nombre} className="size-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {e.nombre}
                    {e.personas > 1 && ` +${e.personas - 1}`}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    <span className={e.enGina ? "" : "font-bold text-primary"}>{e.enGina ? "En Gina" : e.lugar}</span>
                    {/* R62: avisó lejos de Gina */}
                    {e.enGina && e.distanciaM !== null && e.distanciaM > LEJOS_M && (
                      <span className="inline-flex items-center gap-1 font-bold text-warning">
                        <TriangleAlertIcon aria-hidden className="size-4" />
                        avisó a {distanciaTexto(e.distanciaM)}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">{hace(e.creadaEn)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Quién pasó por la lista y por qué salió (§5.17, "Historial de la lista") */}
      <section aria-labelledby="titulo-historial" className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-historial" className="text-base font-bold">
              Quién salió de la lista
            </h2>
            <p className="text-sm text-muted-foreground">Por qué salió cada uno y cuánto tiempo esperó.</p>
          </div>
          <nav aria-label="Período" className="flex gap-1 rounded-full bg-muted p-1">
            {(Object.keys(PERIODOS) as Periodo[]).map((k) => (
              <Link
                key={k}
                href={k === "hoy" ? "/admin/lista-gina" : `/admin/lista-gina?periodo=${k}`}
                scroll={false}
                aria-current={k === periodo ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                  k === periodo ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {PERIODOS[k]}
              </Link>
            ))}
          </nav>
        </header>

        {porMotivo.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {porMotivo.map(({ m, n }) => (
              <li key={m} className={cn("rounded-full px-3 py-1 text-sm font-bold", MOTIVOS[m].clase)}>
                {MOTIVOS[m].texto}: {n}
              </li>
            ))}
            {enLaVan > 0 && (
              <li className="rounded-full bg-warning-muted px-3 py-1 text-sm font-bold text-warning">Se fueron en la van: {enLaVan}</li>
            )}
          </ul>
        )}

        {historial.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed px-4 py-8 text-center text-muted-foreground">Nadie salió de la lista en este período.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {historial.map((h) => (
              <li key={h.id} className="flex items-start gap-3 rounded-2xl border-2 bg-card p-3">
                <Avatar url={h.fotoUrl} nombre={h.nombre} className="size-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {h.nombre}
                    {h.personas > 1 && ` +${h.personas - 1}`}
                    <span className="font-normal text-muted-foreground"> · {h.enGina ? "en Gina" : h.lugar}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={cn("rounded-full px-2 py-0.5 text-sm font-bold", MOTIVOS[h.motivo].clase)}>{h.detalle}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Se anotó a las {hora(h.creadaEn)}
                    {h.cerradaEn && ` · salió a las ${hora(h.cerradaEn)}`}
                    {duracion(h.creadaEn, h.cerradaEn) && ` · esperó ${duracion(h.creadaEn, h.cerradaEn)}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
