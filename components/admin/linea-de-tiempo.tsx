import { TimerIcon } from "lucide-react"

import { hora } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { duracion, ETIQUETA_ESTADO, type EventoViaje, lineaDeTiempo } from "@/lib/viajes"

/**
 * Cronómetro del viaje en el panel (R56): la hora de cada estado, cuánto duró y la puntualidad.
 * Plegado: se abre con un toque para no alargar la lista.
 */
export function LineaDeTiempo({ eventos }: { eventos: EventoViaje[] }) {
  if (eventos.length === 0) return null
  const { pasos, puntualidad, atrasos } = lineaDeTiempo(eventos)

  return (
    <details className="group rounded-xl bg-muted">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 font-bold focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <TimerIcon aria-hidden className="size-5 text-primary" />
          Línea de tiempo
        </span>
        {puntualidad && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-sm",
              puntualidad.aTiempo ? "bg-success-muted text-success" : "bg-warning-muted text-warning"
            )}
          >
            {puntualidad.aTiempo ? "Llegó a tiempo" : `Llegó ${duracion(puntualidad.tardeMin)} tarde`}
          </span>
        )}
      </summary>

      <div className="flex flex-col gap-3 px-3 pb-3">
        <ol className="flex flex-col">
          {pasos.map((p, i) => (
            <li key={`${p.estado}-${p.en}`} className="relative flex gap-3 pb-3 last:pb-0">
              {/* Riel vertical que une los estados */}
              {i < pasos.length - 1 && <span aria-hidden className="absolute top-3 left-[5px] h-full w-0.5 bg-border" />}
              <span aria-hidden className="relative mt-1.5 size-3 shrink-0 rounded-full bg-primary" />
              <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3">
                <span>
                  <span className="font-mono text-[15px] tabular-nums">{hora(p.en)}</span>{" "}
                  <span className="font-bold">{ETIQUETA_ESTADO[p.estado]}</span>
                </span>
                {p.minutos !== null && <span className="text-[15px] text-muted-foreground">{duracion(p.minutos)}</span>}
              </span>
            </li>
          ))}
        </ol>
        {atrasos.map((a) => (
          <p key={a.en} className="text-[15px] font-bold text-warning">
            A las {hora(a.en)} avisó que se atrasa: nueva hora {hora(a.nuevaHora)}.
          </p>
        ))}
        {puntualidad && (
          <p className="text-[15px] text-muted-foreground">
            Prometió llegar a las {hora(puntualidad.prometida)} y llegó a las {hora(puntualidad.llegada)}.
          </p>
        )}
      </div>
    </details>
  )
}
