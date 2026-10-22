import { ChevronRightIcon, StarIcon, XIcon } from "lucide-react"
import Link from "next/link"

import { Estrellas, promedioTexto } from "@/components/estrellas"
import { Avatar } from "@/components/foto/avatar"
import { cargarCalificacionesAdmin, type CalificacionAdmin } from "@/lib/datos/calificaciones-admin"
import { fechaHora, hace, inicioDelDia } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { SENTIDOS } from "@/lib/viajes"

const PERIODOS = [
  { id: "7", titulo: "7 días", dias: 6 },
  { id: "30", titulo: "30 días", dias: 29 },
  { id: "todo", titulo: "Todo", dias: null },
] as const
const NOTAS = [
  { id: "todas", titulo: "Todas" },
  { id: "bajas", titulo: "Solo bajas (1–3 ★)" },
] as const
const BAJA = 3 // de 1 a 3 estrellas: algo salió mal

type Filtros = { base: string; periodo: string; chofer?: string; nota: string }
type Param = string | string[] | undefined
/** El enlace con los filtros de ahora y lo que cambia (en la página donde está) */
const enlace = (f: Filtros, cambio: Partial<Filtros>) => {
  const n = { ...f, ...cambio }
  const q = new URLSearchParams({ periodo: n.periodo, nota: n.nota })
  if (n.chofer) q.set("chofer", n.chofer)
  return `${n.base}?${q}`
}
const promedio = (l: CalificacionAdmin[]) => (l.length ? l.reduce((n, c) => n + c.estrellas, 0) / l.length : null)
const cuantas = (n: number) => (n === 1 ? "1 calificación" : `${n} calificaciones`)

/**
 * Calificaciones (§8): con quién calificó, filtro de período, chofer y nota. De toda la línea (Análisis → Calificaciones)
 * o de un chofer fijo (`choferFijo`, en su detalle: sin "Por chofer" ni el filtro de chofer).
 */
export async function CalificacionesVista({
  base,
  params,
  choferFijo,
  periodoPorDefecto = "30",
}: {
  base: string
  params: { periodo?: Param; nota?: Param; chofer?: Param }
  choferFijo?: string
  periodoPorDefecto?: (typeof PERIODOS)[number]["id"]
}) {
  const periodo = PERIODOS.find((p) => p.id === params.periodo) ?? PERIODOS.find((p) => p.id === periodoPorDefecto) ?? PERIODOS[1]
  const nota = NOTAS.find((n) => n.id === params.nota) ?? NOTAS[0]
  const choferId = choferFijo ?? (typeof params.chofer === "string" ? params.chofer : undefined)
  const filtros: Filtros = { base, periodo: periodo.id, nota: nota.id, chofer: choferFijo ? undefined : choferId }

  const todas = await cargarCalificacionesAdmin(periodo.dias === null ? null : inicioDelDia(periodo.dias))
  const delChofer = choferId ? todas.filter((c) => c.chofer.id === choferId) : todas
  const lista = nota.id === "bajas" ? delChofer.filter((c) => c.estrellas <= BAJA) : delChofer
  const chofer = choferId ? (todas.find((c) => c.chofer.id === choferId)?.chofer ?? null) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Chips aria="Período" opciones={PERIODOS.map((p) => ({ id: p.id, titulo: p.titulo, href: enlace(filtros, { periodo: p.id }) }))} activo={periodo.id} />
        <Chips aria="Nota" opciones={NOTAS.map((n) => ({ id: n.id, titulo: n.titulo, href: enlace(filtros, { nota: n.id }) }))} activo={nota.id} />
        {choferId && !choferFijo && (
          <Link
            href={enlace(filtros, { chofer: undefined })}
            className="flex min-h-11 w-fit items-center gap-2 rounded-full border-2 border-primary bg-primary py-1 pr-3 pl-1 font-bold text-primary-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Avatar url={chofer?.fotoUrl ?? null} nombre={chofer?.nombre ?? "Chofer"} className="size-9 text-sm" />
            {chofer?.nombre ?? "Chofer"}
            <XIcon aria-hidden className="size-5" />
            <span className="sr-only">Quitar el filtro de chofer</span>
          </Link>
        )}
      </div>

      {/* Sin chofer escogido: quién está bien y a quién hay que hablarle */}
      {!choferId && <PorChofer calificaciones={todas} filtros={filtros} />}
      <ResumenNotas calificaciones={delChofer} />

      <section aria-labelledby="titulo-lista" className="flex flex-col gap-3">
        <h2 id="titulo-lista" className="text-base font-bold">
          {nota.id === "bajas" ? "Calificaciones bajas" : "Todas las calificaciones"}{" "}
          <span className="font-normal text-muted-foreground">({lista.length})</span>
        </h2>
        {lista.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed px-4 py-8 text-center text-muted-foreground">
            {nota.id === "bajas" ? "Ninguna calificación baja en este período." : "Nadie calificó en este período."}
          </p>
        ) : (
          <ol className="grid gap-3 lg:grid-cols-2">
            {lista.map((c) => (
              <Tarjeta key={c.id} c={c} conChofer={!choferId} />
            ))}
          </ol>
        )}
        {todas.length === 1000 && <p className="text-sm text-muted-foreground">Se muestran las 1000 más recientes.</p>}
      </section>
    </div>
  )
}

function Chips({ aria, opciones, activo }: { aria: string; opciones: { id: string; titulo: string; href: string }[]; activo: string }) {
  return (
    <nav aria-label={aria} className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <Link
          key={o.id}
          href={o.href}
          aria-current={o.id === activo ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center rounded-full border-2 px-4 font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
            o.id === activo ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
          )}
        >
          {o.titulo}
        </Link>
      ))}
    </nav>
  )
}

/** ★ promedio, cuántas, cuántas de cada nota y las etiquetas más dichas */
function ResumenNotas({ calificaciones: l }: { calificaciones: CalificacionAdmin[] }) {
  const prom = promedio(l)
  const max = Math.max(1, ...[1, 2, 3, 4, 5].map((n) => l.filter((c) => c.estrellas === n).length))
  const etiquetas = [...l.flatMap((c) => c.etiquetas).reduce((m, e) => m.set(e, (m.get(e) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
  return (
    <section aria-label="Resumen" className="grid gap-4 rounded-2xl border-2 bg-card p-4 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-col justify-center gap-1 sm:pr-4">
        <p className="flex items-center gap-2 text-4xl font-bold tabular-nums">
          <StarIcon aria-hidden className="size-8 fill-signal text-signal" />
          {prom !== null ? promedioTexto(prom) : "—"}
        </p>
        <p className="text-muted-foreground">{cuantas(l.length)}</p>
      </div>
      <div className="flex flex-col gap-3">
        <ul className="flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((n) => {
            const k = l.filter((c) => c.estrellas === n).length
            return (
              <li key={n} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 font-bold">
                  {n} <StarIcon aria-hidden className="size-4 fill-signal text-signal" />
                </span>
                <span className="h-3 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn("block h-full rounded-full", n <= BAJA ? "bg-warning" : "bg-primary")}
                    style={{ width: `${(k / max) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">{k}</span>
              </li>
            )
          })}
        </ul>
        {etiquetas.length > 0 && (
          <ul aria-label="Etiquetas" className="flex flex-wrap gap-2">
            {etiquetas.map(([e, k]) => (
              <li key={e} className="rounded-full bg-secondary px-3 py-1 text-sm font-bold text-secondary-foreground">
                {e} · {k}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Cada chofer con su promedio: primero el más bajo (a quién hay que hablarle). Tocar uno filtra por él */
function PorChofer({ calificaciones, filtros }: { calificaciones: CalificacionAdmin[]; filtros: Filtros }) {
  const porChofer = new Map<string, { chofer: CalificacionAdmin["chofer"]; lista: CalificacionAdmin[] }>()
  for (const c of calificaciones) {
    const g = porChofer.get(c.chofer.id) ?? { chofer: c.chofer, lista: [] }
    g.lista.push(c)
    porChofer.set(c.chofer.id, g)
  }
  const filas = [...porChofer.values()]
    .map((g) => ({ ...g, prom: promedio(g.lista) ?? 0, bajas: g.lista.filter((c) => c.estrellas <= BAJA).length }))
    .sort((a, b) => a.prom - b.prom || b.lista.length - a.lista.length)
  if (filas.length === 0) return null

  return (
    <section aria-labelledby="titulo-por-chofer" className="flex flex-col gap-2">
      <h2 id="titulo-por-chofer" className="text-base font-bold">
        Por chofer
      </h2>
      <ul className="grid gap-2 lg:grid-cols-2">
        {filas.map((f) => (
          <li key={f.chofer.id}>
            <Link
              href={enlace(filtros, { chofer: f.chofer.id })}
              className="flex min-h-14 items-center gap-3 rounded-2xl border-2 bg-card px-3 py-2.5 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              <Avatar url={f.chofer.fotoUrl} nombre={f.chofer.nombre} className="size-11" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{f.chofer.nombre}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="inline-flex items-center gap-1 font-bold">
                    <StarIcon aria-hidden className="size-4 fill-signal text-signal" />
                    {promedioTexto(f.prom)}
                  </span>
                  <span className="text-muted-foreground">{cuantas(f.lista.length)}</span>
                  {f.bajas > 0 && (
                    <span className="rounded-full bg-warning-muted px-2 font-bold text-warning">
                      {f.bajas === 1 ? "1 baja" : `${f.bajas} bajas`}
                    </span>
                  )}
                </span>
              </span>
              <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Tarjeta({ c, conChofer }: { c: CalificacionAdmin; conChofer: boolean }) {
  return (
    <li className={cn("flex flex-col gap-2 rounded-2xl border-2 bg-card p-3", c.estrellas <= BAJA && "border-warning/60")}>
      <div className="flex items-center justify-between gap-2">
        <Estrellas valor={c.estrellas} />
        <span className="text-sm text-muted-foreground" title={fechaHora(c.creadaEn)}>
          {hace(c.creadaEn)}
        </span>
      </div>
      {c.comentario && <p className="text-base leading-snug">“{c.comentario}”</p>}
      {c.etiquetas.length > 0 && (
        <ul aria-label="Etiquetas" className="flex flex-wrap gap-1.5">
          {c.etiquetas.map((e) => (
            <li key={e} className="rounded-full bg-secondary px-2.5 py-0.5 text-sm font-bold text-secondary-foreground">
              {e}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-1.5 border-t pt-2 text-sm">
        <p className="flex items-center gap-2">
          <Avatar url={c.pasajero.fotoUrl} nombre={c.pasajero.nombre} className="size-8 text-xs" />
          <span>
            <span className="font-bold">{c.pasajero.nombre}</span>
            {conChofer && <span className="text-muted-foreground"> calificó a </span>}
            {conChofer && <span className="font-bold">{c.chofer.nombre}</span>}
          </span>
        </p>
        {c.sentido && <p className="text-muted-foreground">{SENTIDOS[c.sentido].largo}</p>}
      </div>
    </li>
  )
}
