import { TriangleAlertIcon } from "lucide-react"

import type { DemandaOferta, Hora } from "@/lib/datos/demanda"
import { cn } from "@/lib/utils"

// Demanda y oferta (§8, R87). Cada parte de las barras lleva su número escrito al lado: los colores solos no bastan.
const numero = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 1 })
const n = (x: number) => numero.format(x)
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
const horaTexto = (h: number) => `${h % 12 || 12} ${h < 12 ? "a. m." : "p. m."}`
const diaTexto = (d: string) =>
  new Intl.DateTimeFormat("es-VE", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))

const RESULTADOS = [
  { clave: "valle_llevados", texto: "Llevadas", color: "bg-success" },
  { clave: "valle_otro", texto: "Se fueron en otro transporte", color: "bg-destructive" },
  { clave: "valle_vencio", texto: "La anotación venció", color: "bg-warning" },
  { clave: "valle_desistio", texto: "Desistieron", color: "bg-muted-foreground/50" },
] as const

/** Los totales del período: a Valle Grande (con qué pasó con cada persona), al Centro y quién no tiene la app */
export function TotalesDemanda({ datos }: { datos: DemandaOferta }) {
  const t = datos.totales
  const resueltas = RESULTADOS.reduce((s, r) => s + t[r.clave], 0)
  const esperando = t.valle_quieren - resueltas
  const llevados = t.valle_llevados + t.centro_llevados

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      <section aria-labelledby="tot-valle" className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4 lg:col-span-2">
        <h2 id="tot-valle" className="text-base font-bold">
          A Valle Grande (desde Gina)
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xl leading-none font-bold tabular-nums">{n(t.valle_quieren)}</span>
          <span className="text-muted-foreground">
            {t.valle_quieren === 1 ? "persona quería ir" : "personas querían ir"} · {pct(t.valle_llevados, t.valle_quieren)}% llevadas
          </span>
        </p>
        {t.valle_quieren > 0 && (
          <div role="img" aria-label={RESULTADOS.map((r) => `${r.texto}: ${t[r.clave]}`).join(", ")} className="flex h-4 w-full gap-0.5">
            {RESULTADOS.filter((r) => t[r.clave] > 0).map((r) => (
              <div
                key={r.clave}
                title={`${r.texto}: ${t[r.clave]}`}
                className={cn("h-full rounded-sm first:rounded-l-full last:rounded-r-full", r.color)}
                style={{ width: `${(t[r.clave] / t.valle_quieren) * 100}%` }}
              />
            ))}
          </div>
        )}
        <ul className="flex flex-col gap-1.5">
          {RESULTADOS.map((r) => (
            <li key={r.clave} className="flex items-center gap-2 text-sm">
              <span aria-hidden className={cn("size-3 shrink-0 rounded-sm", r.color)} />
              <span className="flex-1">{r.texto}</span>
              <span className="font-bold tabular-nums">{n(t[r.clave])}</span>
              <span className="w-11 text-right text-muted-foreground tabular-nums">{pct(t[r.clave], t.valle_quieren)}%</span>
            </li>
          ))}
          {esperando > 0 && (
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <span aria-hidden className="size-3 shrink-0" />
              <span className="flex-1">Siguen esperando ahora</span>
              <span className="font-bold tabular-nums">{n(esperando)}</span>
              <span className="w-11" />
            </li>
          )}
        </ul>
      </section>

      <div className="flex flex-col gap-4">
        <section aria-labelledby="tot-centro" className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
          <h2 id="tot-centro" className="text-base font-bold">
            Al Centro
          </h2>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl leading-none font-bold tabular-nums">{n(t.centro_llevados)}</span>
            <span className="text-muted-foreground">{t.centro_llevados === 1 ? "persona llevada" : "personas llevadas"}</span>
          </p>
          <p className="text-sm">
            <span className="font-bold tabular-nums">{n(t.centro_no_atendidos)}</span> no atendidas (sin puesto, rechazadas o no llegaron)
          </p>
          <p className="text-sm text-muted-foreground">Sin lista hacia el Centro: quien no consiguió carro no queda registrado.</p>
        </section>

        <section aria-labelledby="tot-sin-app" className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
          <h2 id="tot-sin-app" className="text-base font-bold">
            Sin la app
          </h2>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl leading-none font-bold tabular-nums">{pct(t.llevados_sin_app, llevados)}%</span>
            <span className="text-muted-foreground">
              de {n(llevados)} llevados ({n(t.llevados_sin_app)}) los subió el chofer: la demanda real es mayor que la de la app
            </span>
          </p>
        </section>
      </div>
    </div>
  )
}

/** Una barra de 0 a `maximo`, con otra adentro (por ejemplo, querían ir y fueron llevadas) */
function Barra({ total, dentro, maximo, colorTotal, colorDentro }: { total: number; dentro?: number; maximo: number; colorTotal: string; colorDentro?: string }) {
  return (
    <div aria-hidden className="h-3 w-full rounded-full bg-muted">
      <div className={cn("relative h-full rounded-full", colorTotal)} style={{ width: `${maximo ? (total / maximo) * 100 : 0}%` }}>
        {dentro !== undefined && total > 0 && (
          <div className={cn("absolute inset-y-0 left-0 rounded-full", colorDentro)} style={{ width: `${(dentro / total) * 100}%` }} />
        )}
      </div>
    </div>
  )
}

/** Por hora: la demanda de cada sentido contra las salidas y los choferes trabajando */
export function DemandaPorHora({ horas, promedio }: { horas: Hora[]; promedio: boolean }) {
  if (horas.length === 0) return <p className="text-muted-foreground">No hubo movimiento en este período.</p>
  const maxValle = Math.max(...horas.map((h) => h.valle_quieren))
  const maxCentro = Math.max(...horas.map((h) => h.centro_llevados))

  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden className="hidden gap-4 px-3 text-sm font-bold text-muted-foreground md:grid md:grid-cols-[5rem_1fr_1fr_13rem]">
        <span>Hora</span>
        <span>A Valle Grande</span>
        <span>Al Centro</span>
        <span>Oferta</span>
      </div>
      <ul className="flex flex-col gap-2">
        {horas.map((h) => (
          <li
            key={h.hora}
            className={cn(
              "grid gap-x-4 gap-y-2 rounded-xl border-2 bg-card p-3 md:grid-cols-[5rem_1fr_1fr_13rem] md:items-center",
              h.faltaTransporte && "border-warning/60 bg-warning-muted"
            )}
          >
            <span className="flex items-center gap-1.5 font-bold">
              {horaTexto(h.hora)}
              {h.faltaTransporte && <TriangleAlertIcon aria-label="Faltó transporte a Valle Grande" className="size-4 text-warning" />}
            </span>
            <div className="flex flex-col gap-1">
              <Barra total={h.valle_quieren} dentro={h.valle_llevados} maximo={maxValle} colorTotal="bg-warning/40" colorDentro="bg-success" />
              <span className="text-sm">
                <span className="md:hidden">A Valle Grande: </span>
                <b className="tabular-nums">{n(h.valle_quieren)}</b> querían ir · <b className="tabular-nums">{n(h.valle_llevados)}</b> llevadas
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <Barra total={h.centro_llevados} maximo={maxCentro} colorTotal="bg-primary" />
              <span className="text-sm">
                <span className="md:hidden">Al Centro: </span>
                <b className="tabular-nums">{n(h.centro_llevados)}</b> llevadas
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              Salidas: <b className="text-foreground tabular-nums">{n(h.valle_salidas)}</b> a VG ·{" "}
              <b className="text-foreground tabular-nums">{n(h.centro_salidas)}</b> al Centro
              <br />
              <b className="text-foreground tabular-nums">{n(h.choferes)}</b> {h.choferes === 1 ? "chofer trabajando" : "choferes trabajando"}
            </span>
          </li>
        ))}
      </ul>
      {promedio && <p className="text-sm text-muted-foreground">Números por hora: promedio por día del período.</p>}
    </div>
  )
}

/** Por día, el más reciente primero */
export function DemandaPorDia({ dias }: { dias: DemandaOferta["porDia"] }) {
  if (dias.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-2xl border-2 bg-card">
      <table className="w-full min-w-[34rem] text-sm">
        <thead className="text-left text-muted-foreground">
          <tr className="border-b">
            <th className="p-3 font-bold">Día</th>
            <th className="p-3 text-right font-bold">A VG querían</th>
            <th className="p-3 text-right font-bold">A VG llevadas</th>
            <th className="p-3 text-right font-bold">Al Centro llevadas</th>
            <th className="p-3 text-right font-bold">Salidas</th>
            <th className="p-3 text-right font-bold">Choferes a la vez (máx.)</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {dias.map((d) => (
            <tr key={d.dia} className="border-b last:border-0">
              <td className="p-3 font-bold capitalize">{diaTexto(d.dia)}</td>
              <td className="p-3 text-right">{d.valle_quieren}</td>
              <td className="p-3 text-right">
                {d.valle_llevados} <span className="text-muted-foreground">({pct(d.valle_llevados, d.valle_quieren)}%)</span>
              </td>
              <td className="p-3 text-right">{d.centro_llevados}</td>
              <td className="p-3 text-right">{d.valle_salidas + d.centro_salidas}</td>
              <td className="p-3 text-right">{d.choferesMax}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Cómo se cuenta (R87), para leer los números sin engañarse */
export function ComoSeCuenta() {
  return (
    <details className="rounded-2xl border-2 bg-card p-4 text-sm">
      <summary className="cursor-pointer font-bold">Cómo se cuenta</summary>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground">
        <li>Personas, no anotaciones: quien se vuelve a anotar menos de 60 min después cuenta una sola vez.</li>
        <li>A Valle Grande suma la lista, los pedidos en el camino y la gente sin app que subió el chofer.</li>
        <li>“La anotación venció” puede incluir a quien subió a un carro sin que lo marcaran, o se fue sin avisar.</li>
        <li>Quien abrió la app, vio que no había carro y no se anotó, no aparece: la demanda real es mayor.</li>
        <li>Cada espera cuenta en la hora en que empezó; cada salida, en la hora en que salió el carro.</li>
        <li>No cuentan las cuentas marcadas de prueba (en su detalle, en Choferes o Pasajeros).</li>
      </ul>
    </details>
  )
}
