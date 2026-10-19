import { BusIcon, ChevronDownIcon, UserXIcon } from "lucide-react"
import Link from "next/link"

import { Estrellas, promedioTexto } from "@/components/estrellas"
import { buttonVariants } from "@/components/ui/button"
import type { PersonaDelViaje, ViajeTerminado } from "@/lib/datos/historial"
import { diaYHora, hora } from "@/lib/fechas"
import { duracion, SENTIDOS } from "@/lib/viajes"

const ENTRADA: Record<PersonaDelViaje["entrada"], string> = {
  app: "Con la app",
  a_mano: "Anotado a mano",
  en_el_camino: "Recogido en el camino",
}

/**
 * Mis viajes del chofer (R50): los últimos 20 terminados, plegados; al abrir, a quién llevó y cómo le fue.
 * Con `admin` es la lista de Viajes terminados del panel (§8): dice qué chofer y quién calificó.
 */
export function ViajesChofer({ viajes, admin = false }: { viajes: ViajeTerminado[]; admin?: boolean }) {
  if (viajes.length === 0 && admin) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-5 py-10 text-center">
        <BusIcon aria-hidden className="size-10 text-muted-foreground" />
        <p className="text-lg font-bold">No hay viajes terminados en este período</p>
      </div>
    )
  }
  if (viajes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-5 py-10 text-center">
        <BusIcon aria-hidden className="size-10 text-muted-foreground" />
        <p className="text-lg font-bold">Todavía no terminaste ningún viaje</p>
        <p className="text-muted-foreground">Cuando termines uno, aquí vas a ver a quién llevaste y cómo te calificaron.</p>
        <Link href="/inicio" className={buttonVariants({ className: "mt-2" })}>
          Ir a Inicio
        </Link>
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-3">
      {viajes.map((v) => {
        const promedio = v.calificaciones.length ? v.calificaciones.reduce((s, c) => s + c.estrellas, 0) / v.calificaciones.length : null
        // El admin ve todas con quién calificó; el chofer, solo los comentarios sin nombre (R52)
        const comentarios = admin ? v.calificaciones : v.calificaciones.filter((c) => c.comentario)
        return (
          <li key={v.id}>
            <details className="group rounded-2xl border-2 bg-card">
              <summary className="flex cursor-pointer list-none items-start gap-3 rounded-2xl p-4 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  {v.chofer && (
                    <span className="block font-bold text-primary">
                      {v.chofer.nombre}
                      {v.chofer.placa && <span className="ml-2 font-mono text-sm tracking-wider text-muted-foreground">{v.chofer.placa}</span>}
                    </span>
                  )}
                  <span className="block text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[v.sentido].largo}</span>
                  <span className="block text-lg leading-tight font-bold">{v.salida ? diaYHora(v.salida) : "Sin hora de salida"}</span>
                  <span className="block text-[15px] text-muted-foreground">
                    {v.llevo.length === 1 ? "1 pasajero" : `${v.llevo.length} pasajeros`}
                    {v.minutos !== null && ` · ${duracion(v.minutos)}`}
                    {promedio !== null && ` · ★ ${promedioTexto(promedio)}`}
                  </span>
                </span>
                <ChevronDownIcon aria-hidden className="mt-6 size-6 shrink-0 transition-transform group-open:rotate-180" />
              </summary>

              <div className="flex flex-col gap-4 px-4 pb-4">
                {v.salida && v.llegada && (
                  <p className="text-muted-foreground">
                    Salió a las {hora(v.salida)} y llegó a las {hora(v.llegada)}.
                  </p>
                )}

                <section className="flex flex-col gap-2">
                  <h3 className="font-bold">
                    {admin ? "Llevó" : "Llevaste"} <span className="font-normal text-muted-foreground">({v.llevo.length} de {v.puestos} puestos)</span>
                  </h3>
                  {v.llevo.length === 0 ? (
                    <p className="text-muted-foreground">Nadie en este viaje.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {v.llevo.map((p, i) => (
                        <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-xl bg-muted px-3 py-2">
                          <span className="font-bold">{p.nombre}</span>
                          <span className="text-sm text-muted-foreground">
                            {ENTRADA[p.entrada]}
                            {p.seBajoAntes && " · se bajó antes"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {v.noVinieron.length > 0 && (
                  <section className="flex flex-col gap-1">
                    <h3 className="flex items-center gap-1.5 font-bold">
                      <UserXIcon aria-hidden className="size-5 text-destructive" />
                      No vinieron
                    </h3>
                    <p>{v.noVinieron.join(", ")}</p>
                  </section>
                )}

                <section className="flex flex-col gap-2">
                  <h3 className="font-bold">Calificaciones de este viaje</h3>
                  {v.calificaciones.length === 0 ? (
                    <p className="text-muted-foreground">Nadie lo calificó todavía.</p>
                  ) : (
                    <>
                      <p className="flex items-center gap-2">
                        <Estrellas valor={promedio ?? 0} />
                        <span className="text-muted-foreground">
                          {promedioTexto(promedio ?? 0)} · {v.calificaciones.length === 1 ? "1 calificación" : `${v.calificaciones.length} calificaciones`}
                        </span>
                      </p>
                      {comentarios.map((c, i) => (
                        <blockquote key={i} className="rounded-xl border-l-4 border-signal bg-muted px-3 py-2">
                          {c.autor && (
                            <span className="mb-0.5 flex items-center gap-2 text-sm font-bold">
                              {c.autor} <Estrellas valor={c.estrellas} tamano="size-4" />
                            </span>
                          )}
                          {c.comentario ? `“${c.comentario}”` : <span className="text-muted-foreground">Sin comentario</span>}
                        </blockquote>
                      ))}
                    </>
                  )}
                </section>
              </div>
            </details>
          </li>
        )
      })}
    </ol>
  )
}
