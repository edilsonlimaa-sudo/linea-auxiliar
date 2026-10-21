import { TriangleAlertIcon } from "lucide-react"
import type { Metadata } from "next"

import { EnVivo } from "@/components/en-vivo"
import { Avatar } from "@/components/foto/avatar"
import { cargarListaGinaAdmin } from "@/lib/datos/lista-gina"
import { hace } from "@/lib/fechas"
import { distanciaTexto } from "@/lib/mapa"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Lista hacia Valle Grande · Administración" }

const LEJOS_M = 300 // como en el aviso del pasajero (R62)

// Lista hacia Valle Grande en vivo (docs/especificacion.md §5.17): quién espera para Centro → Valle Grande, en orden
export default async function PaginaListaGina() {
  await exigirAdmin()
  const lista = await cargarListaGinaAdmin()
  const enGina = lista.filter((e) => e.enGina).reduce((n, e) => n + e.personas, 0)
  const enCamino = lista.filter((e) => !e.enGina).reduce((n, e) => n + e.personas, 0)

  return (
    <div className="flex flex-col gap-6">
      <EnVivo />
      <header className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-bold">Lista hacia Valle Grande</h1>
        <p className="text-muted-foreground">Centro → Valle Grande, por orden de llegada. Se actualiza sola.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 bg-card px-4 py-3">
          <p className="text-3xl font-bold tabular-nums">{enGina}</p>
          <p className="text-[15px] text-muted-foreground">esperando en Gina</p>
        </div>
        <div className="rounded-2xl border-2 bg-card px-4 py-3">
          <p className="text-3xl font-bold tabular-nums">{enCamino}</p>
          <p className="text-[15px] text-muted-foreground">en otro lugar del camino</p>
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
                <p className="flex flex-wrap items-center gap-x-2 text-[15px] text-muted-foreground">
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
    </div>
  )
}
