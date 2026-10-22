import { StarIcon } from "lucide-react"

import { Estrellas, promedioTexto } from "@/components/estrellas"
import type { ResumenCalificaciones } from "@/lib/datos/historial"
import { diaYHora } from "@/lib/fechas"
import { SENTIDOS } from "@/lib/viajes"

/** Mis calificaciones del chofer (R52): resumen, cuántas de cada estrella, etiquetas y comentarios, sin nombres */
export function CalificacionesChofer({ resumen }: { resumen: ResumenCalificaciones }) {
  const { promedio, cantidad, porEstrellas, etiquetas, recientes } = resumen

  if (cantidad === 0 || promedio === null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center">
        <StarIcon aria-hidden className="size-10 text-muted-foreground" />
        <p className="text-base font-bold">Todavía no tienes calificaciones</p>
        <p className="text-muted-foreground">Al terminar cada viaje, la app les pide a tus pasajeros que te califiquen.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Resumen */}
      <section aria-label="Resumen" className="flex flex-col items-center gap-2 rounded-2xl border-2 bg-card p-4 text-center">
        <p className="text-5xl leading-none font-bold">{promedioTexto(promedio)}</p>
        <Estrellas valor={promedio} tamano="size-7" />
        <p className="text-muted-foreground">{cantidad === 1 ? "1 calificación" : `${cantidad} calificaciones`}</p>
      </section>

      {/* Cuántas de cada estrella */}
      <section aria-labelledby="titulo-estrellas" className="flex flex-col gap-2">
        <h2 id="titulo-estrellas" className="text-base font-bold">
          Cómo te calificaron
        </h2>
        <ul className="flex flex-col gap-1.5">
          {([5, 4, 3, 2, 1] as const).map((n) => {
            const veces = porEstrellas[n]
            return (
              <li key={n} className="flex items-center gap-3">
                <span className="w-10 shrink-0 font-bold tabular-nums">
                  {n} <span aria-hidden>★</span>
                  <span className="sr-only">estrellas</span>
                </span>
                <span aria-hidden className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-signal" style={{ width: `${(veces / cantidad) * 100}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">{veces}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Etiquetas */}
      {etiquetas.length > 0 && (
        <section aria-labelledby="titulo-etiquetas" className="flex flex-col gap-2">
          <h2 id="titulo-etiquetas" className="text-base font-bold">
            Lo que más destacan
          </h2>
          <ul className="flex flex-wrap gap-2">
            {etiquetas.map((e) => (
              <li key={e.etiqueta} className="rounded-full border-2 bg-card px-3 py-1.5 font-bold">
                {e.etiqueta} <span className="font-normal text-muted-foreground">× {e.veces}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Comentarios recientes */}
      <section aria-labelledby="titulo-recientes" className="flex flex-col gap-2">
        <h2 id="titulo-recientes" className="text-base font-bold">
          Recientes
        </h2>
        <p className="-mt-1 text-sm text-muted-foreground">No se muestra quién calificó, para que cada pasajero opine con libertad.</p>
        <ol className="flex flex-col gap-2">
          {recientes.map((c, i) => (
            <li key={i} className="flex flex-col gap-1.5 rounded-2xl border-2 bg-card p-3">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <Estrellas valor={c.estrellas} />
                <span className="text-sm text-muted-foreground">
                  {diaYHora(c.creadoEn)}
                  {c.sentido && ` · ${SENTIDOS[c.sentido].largo}`}
                </span>
              </p>
              {c.comentario && <p>“{c.comentario}”</p>}
              {c.etiquetas.length > 0 && <p className="text-sm text-muted-foreground">{c.etiquetas.join(" · ")}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
