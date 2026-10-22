import { BusIcon, ChevronDownIcon, CircleXIcon, UserXIcon } from "lucide-react"
import Link from "next/link"

import { LineaDeTiempo } from "@/components/admin/linea-de-tiempo"
import { Estrellas, promedioTexto } from "@/components/estrellas"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import type { Cierre, PersonaDelViaje, ViajeTerminado } from "@/lib/datos/historial"
import { diaYHora, hora } from "@/lib/fechas"
import { DETALLE_CANCELAR, QUIEN_CERRO } from "@/lib/motivos-cancelar"
import { cn } from "@/lib/utils"
import { conAcompanantes, duracion, type EventoViaje, SENTIDOS, sumaPersonas } from "@/lib/viajes"

const ENTRADA: Record<PersonaDelViaje["entrada"], string> = {
  app: "Con la app",
  a_mano: "Anotado a mano",
  en_el_camino: "Recogido en el camino",
}

/** Hasta dónde llegó un viaje cancelado, por su línea de tiempo (sin eventos, no se sabe) */
function hastaDonde(eventos: EventoViaje[] | undefined): string | null {
  if (!eventos?.length) return null
  if (eventos.some((e) => e.estado === "en_parada")) return "Después de llegar a recoger"
  if (eventos.some((e) => e.estado === "llegando")) return "Avisó que llegaba"
  return "Antes de llegar a recoger"
}

/** Qué avisó al salir que haría después (R73) */
function textoDespues(d: ViajeTerminado["despues"]): string | null {
  if (!d) return null
  if (d.tipo === "vuelta") return "Después: publicó la vuelta."
  if (d.tipo === "ultimo") return "Después: avisó que era su último viaje del día."
  return `Después: avisó una pausa${d.vuelveEn ? ` hasta las ${hora(d.vuelveEn)}` : ""}.`
}

/** Quién lo cerró y por qué (R72): "Lo canceló el chofer · Quería cambiar la hora" */
function quienYPorQue(c: Cierre | null | undefined): string | null {
  if (!c) return null
  return [QUIEN_CERRO[c.por], c.motivo && DETALLE_CANCELAR[c.motivo]].filter(Boolean).join(" · ")
}

/**
 * Mis viajes del chofer (R50): los últimos 20 terminados, plegados; al abrir, a quién llevó y cómo le fue.
 * Con `admin` es la lista de Viajes terminados del panel (§8): dice qué chofer y quién calificó, y muestra también los
 * cancelados (en rojo: hasta dónde llegó y quién perdió su puesto).
 */
export function ViajesChofer({ viajes, admin = false }: { viajes: ViajeTerminado[]; admin?: boolean }) {
  if (viajes.length === 0 && admin) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center">
        <BusIcon aria-hidden className="size-10 text-muted-foreground" />
        <p className="text-base font-bold">No hay viajes con estos filtros</p>
      </div>
    )
  }
  if (viajes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center">
        <BusIcon aria-hidden className="size-10 text-muted-foreground" />
        <p className="text-base font-bold">Todavía no terminaste ningún viaje</p>
        <p className="text-muted-foreground">Cuando termines uno, aquí vas a ver a quién llevaste y cómo te calificaron.</p>
        <Link href="/inicio" className={buttonVariants({ className: "mt-2" })}>
          Ir a Inicio
        </Link>
      </div>
    )
  }

  return (
    // En el panel, con pantalla grande, en dos columnas
    <ol className={admin ? "grid gap-3 lg:grid-cols-2 lg:items-start" : "flex flex-col gap-3"}>
      {viajes.map((v) => {
        const promedio = v.calificaciones.length ? v.calificaciones.reduce((s, c) => s + c.estrellas, 0) / v.calificaciones.length : null
        // El admin ve todas con quién calificó; el chofer, solo los comentarios sin nombre (R52)
        const comentarios = admin ? v.calificaciones : v.calificaciones.filter((c) => c.comentario)
        const cancelado = v.estado === "cancelado"
        const donde = cancelado ? hastaDonde(v.eventos) : null
        const porQue = quienYPorQue(v.cierre)
        return (
          <li key={v.id}>
            <details className={cn("group rounded-2xl border-2 bg-card", cancelado && "border-destructive/40")}>
              <summary className="flex cursor-pointer list-none items-start gap-3 rounded-2xl p-4 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  {v.chofer && (
                    <span className="block font-bold text-primary">
                      {v.chofer.nombre}
                      {v.chofer.placa && <span className="ml-2 font-mono text-sm tracking-wider text-muted-foreground">{v.chofer.placa}</span>}
                    </span>
                  )}
                  <span className="block text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[v.sentido].largo}</span>
                  {cancelado ? (
                    <>
                      <span className="flex flex-wrap items-center gap-2 text-base leading-tight font-bold">
                        <Badge variant="destructive">
                          <CircleXIcon aria-hidden /> Cancelado
                        </Badge>
                        {diaYHora(v.cerrado)}
                      </span>
                      {porQue && <span className="block text-sm font-bold">{porQue}</span>}
                      <span className="block text-sm text-muted-foreground">
                        {[donde, v.perdieron.length > 0 && (v.perdieron.length === 1 ? "1 perdió su puesto" : `${v.perdieron.length} perdieron su puesto`)]
                          .filter(Boolean)
                          .join(" · ") || "Nadie tenía puesto"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-base leading-tight font-bold">{v.salida ? diaYHora(v.salida) : "Sin hora de salida"}</span>
                      <span className="block text-sm text-muted-foreground">
                        {sumaPersonas(v.llevo) === 1 ? "1 pasajero" : `${sumaPersonas(v.llevo)} pasajeros`}
                        {v.minutos !== null && ` · ${duracion(v.minutos)}`}
                        {promedio !== null && ` · ★ ${promedioTexto(promedio)}`}
                      </span>
                    </>
                  )}
                </span>
                <ChevronDownIcon aria-hidden className="mt-6 size-6 shrink-0 transition-transform group-open:rotate-180" />
              </summary>

              {cancelado ? (
                <div className="flex flex-col gap-4 px-4 pb-4">
                  <p className="text-muted-foreground">
                    Se canceló a las {hora(v.cerrado)}.{" "}
                    {porQue ? `${porQue}.` : "No se guardó quién ni por qué (antes del 22 de octubre)."}
                  </p>
                  {v.cierre?.detalle && (
                    <blockquote className="rounded-xl border-l-4 border-destructive bg-muted px-3 py-2">“{v.cierre.detalle}”</blockquote>
                  )}
                  {v.eventos && <LineaDeTiempo eventos={v.eventos} />}
                  <section className="flex flex-col gap-1">
                    <h3 className="font-bold">Perdieron su puesto</h3>
                    <p className={cn(v.perdieron.length === 0 && "text-muted-foreground")}>
                      {v.perdieron.length > 0 ? v.perdieron.join(", ") : "Nadie: no tenía gente anotada."}
                    </p>
                  </section>
                </div>
              ) : (
                <div className="flex flex-col gap-4 px-4 pb-4">
                  {v.salida && v.llegada && (
                    <p className="text-muted-foreground">
                      Salió a las {hora(v.salida)} y llegó a las {hora(v.llegada)}.{porQue && ` ${porQue}.`}
                      {textoDespues(v.despues) && ` ${textoDespues(v.despues)}`}
                    </p>
                  )}
                  {/* Cronómetro (R56): solo el admin lo recibe */}
                  {v.eventos && <LineaDeTiempo eventos={v.eventos} />}

                  <section className="flex flex-col gap-2">
                    <h3 className="font-bold">
                      {admin ? "Llevó" : "Llevaste"} <span className="font-normal text-muted-foreground">({sumaPersonas(v.llevo)} de {v.puestos} puestos)</span>
                    </h3>
                    {v.llevo.length === 0 ? (
                      <p className="text-muted-foreground">Nadie en este viaje.</p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {v.llevo.map((p, i) => (
                          <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-xl bg-muted px-3 py-2">
                            <span className="font-bold">{conAcompanantes(p.nombre, p.personas)}</span>
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
              )}
            </details>
          </li>
        )
      })}
    </ol>
  )
}
