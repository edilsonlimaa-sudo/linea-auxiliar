import { TriangleAlertIcon, UndoDotIcon, UsersIcon } from "lucide-react"
import type { Metadata } from "next"

import { Badge } from "@/components/ui/badge"
import { cargarErrores } from "@/lib/datos/errores"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Errores de la app · Administración" }

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(new Date(iso))

const TIPO: Record<string, string> = { version: "De versión", red: "Sin señal", otro: "Otro" }

/** "Android 13 · Chrome 130" a partir del userAgent: lo justo para reconocer el teléfono */
function telefono(ua: string | null) {
  if (!ua) return "?"
  const so = ua.match(/Android [\d.]+|iPhone OS [\d_]+|Windows NT [\d.]+|Mac OS X [\d_]+/)?.[0]?.replace(/_/g, ".") ?? "?"
  const nav = ua.match(/(SamsungBrowser|Edg|OPR|Chrome|Firefox|Version)\/(\d+)/)
  const nombre = nav ? `${nav[1] === "Version" ? "Safari" : nav[1] === "Edg" ? "Edge" : nav[1]} ${nav[2]}` : ""
  return [so, nombre].filter(Boolean).join(" · ") + (/; wv\)/.test(ua) ? " · WebView" : "")
}

function vuelta(s: number | null) {
  if (s === null) return "no había salido de la app"
  if (s < 60) return `volvió a la app hace ${s} s`
  if (s < 3600) return `volvió a la app hace ${Math.round(s / 60)} min`
  return `volvió a la app hace ${Math.round(s / 3600)} h`
}

// Errores de la app (docs/especificacion.md §5.27, R106–R107): cada pantalla de error que vio alguien
export default async function PaginaErrores() {
  await exigirAdmin()
  const { errores, grupos, personas, error } = await cargarErrores(7)
  const alVolver = errores.filter((e) => e.volvioHace !== null && e.volvioHace < 60).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Errores de la app</h1>
        <p className="text-muted-foreground">
          Cada vez que alguien vio la pantalla &quot;Algo salió mal&quot; o &quot;Sin conexión&quot;, en los últimos 7 días. Se borran a los 30
          días.
        </p>
      </div>

      {error ? <p className="rounded-2xl border-2 border-destructive p-4 text-destructive">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Cifra icono={<TriangleAlertIcon aria-hidden className="mb-1 size-5 text-primary" />} valor={errores.length} texto={errores.length === 1 ? "error" : "errores"} />
        <Cifra icono={<UsersIcon aria-hidden className="mb-1 size-5 text-primary" />} valor={personas} texto={personas === 1 ? "persona" : "personas"} />
        <Cifra icono={<UndoDotIcon aria-hidden className="mb-1 size-5 text-primary" />} valor={alVolver} texto="en el primer minuto al volver a la app" />
      </div>

      {errores.length === 0 && !error ? <p className="text-muted-foreground">Nadie vio una pantalla de error en estos 7 días.</p> : null}

      {grupos.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Por error</h2>
          {grupos.map((g) => (
            <article key={`${g.tipo}|${g.mensaje}`} className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{TIPO[g.tipo] ?? g.tipo}</Badge>
                <p className="font-bold">
                  {g.veces} {g.veces === 1 ? "vez" : "veces"} · {g.personas} {g.personas === 1 ? "persona" : "personas"}
                </p>
                <p className="text-sm text-muted-foreground">última: {fecha(g.ultima)}</p>
              </div>
              <p className="font-mono text-sm break-all">{g.mensaje}</p>
              <p className="text-sm text-muted-foreground">En: {g.pantallas.join(", ")}</p>
            </article>
          ))}
        </section>
      ) : null}

      {errores.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Los más recientes</h2>
          {errores.slice(0, 100).map((e) => (
            <article key={e.id} className="flex flex-col gap-1 rounded-2xl border-2 bg-card p-4 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-base font-bold">
                  {e.quien ?? "Sin sesión"}
                  {e.rol ? <span className="font-normal text-muted-foreground"> · {e.rol === "chofer" ? "Chofer" : "Pasajero"}</span> : null}
                </p>
                <p className="text-muted-foreground">{fecha(e.cuando)}</p>
              </div>
              <p>
                <b>{e.pantalla}</b> · {e.interfaz === "global" ? "pantalla general" : e.interfaz === "nueva" ? "nueva" : "clásica"} ·{" "}
                {TIPO[e.tipo] ?? e.tipo} · {e.enLinea === false ? "sin internet" : "con internet"} · {vuelta(e.volvioHace)}
              </p>
              <p className="font-mono break-all text-muted-foreground">{e.mensaje}</p>
              <p className="text-muted-foreground">
                {telefono(e.aparato)}
                {e.version ? ` · versión ${e.version}` : ""}
                {e.digest ? ` · código ${e.digest}` : ""}
              </p>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  )
}

function Cifra({ icono, valor, texto }: { icono: React.ReactNode; valor: number; texto: string }) {
  return (
    <div className="rounded-2xl border-2 bg-card p-4">
      {icono}
      <p className="text-3xl font-bold">{valor}</p>
      <p className="text-muted-foreground">{texto}</p>
    </div>
  )
}
