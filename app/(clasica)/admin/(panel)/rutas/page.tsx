import { RouteIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { GrabarRecorridos } from "@/components/admin/grabar-recorridos"
import { MapaRutas } from "@/components/admin/mapa-rutas"
import { COLOR_FUERA_DE_VIAJE, COLOR_SENTIDO } from "@/lib/mapa"
import { cargarRutas, PERIODOS_RUTAS, type PeriodoRutas, SENTIDOS_RUTAS, VER_RUTAS, type VerRutas } from "@/lib/datos/rutas"
import { exigirAdmin } from "@/lib/sesion"
import { cn } from "@/lib/utils"
import { SENTIDOS, type Sentido } from "@/lib/viajes"

export const metadata: Metadata = { title: "Rutas · Administración · Línea Auxiliar" }

// Rutas (R92): la ruta de verdad, dibujada con el recorrido que graban los teléfonos de los choferes
export default async function PaginaRutas({ searchParams }: PageProps<"/admin/rutas">) {
  await exigirAdmin()
  const { periodo: p, sentido: s, chofer: c, ver: w } = await searchParams
  const periodo: PeriodoRutas = PERIODOS_RUTAS.find((x) => x.id === p)?.id ?? "7"
  const sentido: Sentido | null = SENTIDOS_RUTAS.find((x) => x.id === s)?.id ?? null
  const chofer = typeof c === "string" && /^[0-9a-f-]{36}$/i.test(c) ? c : null
  const ver: VerRutas = VER_RUTAS.find((x) => x.id === w)?.id ?? "todo"
  const datos = await cargarRutas(periodo, sentido, chofer, ver)
  const enlace = (cambio: { periodo?: string; sentido?: string | null; chofer?: string | null; ver?: VerRutas }) => {
    const q = new URLSearchParams({ periodo: cambio.periodo ?? periodo })
    const sen = cambio.sentido === undefined ? sentido : cambio.sentido
    const cho = cambio.chofer === undefined ? chofer : cambio.chofer
    if (sen) q.set("sentido", sen)
    if (cho) q.set("chofer", cho)
    if ((cambio.ver ?? ver) === "viajes") q.set("ver", "viajes")
    return `/admin/rutas?${q}`
  }
  const viajes = new Set(datos.tramos.filter((t) => t.viaje).map((t) => t.viaje))
  const porSentido = (x: Sentido) => new Set(datos.tramos.filter((t) => t.sentido === x).map((t) => t.viaje)).size
  const hayFuera = datos.tramos.some((t) => !t.sentido)

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl leading-tight font-bold">Rutas</h1>
        <p className="text-muted-foreground">
          Por dónde van de verdad los carros, con el recorrido que graban los teléfonos de los choferes. Cada viaje es una línea:
          donde se juntan muchas está la ruta principal; las sueltas son variantes. En gris, lo de fuera de un viaje: recoger
          gente antes de salir, ir a la salida o volver vacío. Donde el GPS dejó de grabar, la línea se corta.
        </p>
      </header>

      <GrabarRecorridos resumen={datos.resumen} />

      <div className="flex flex-col gap-2">
        <Filtro etiqueta="Período" opciones={PERIODOS_RUTAS.map((o) => ({ ...o, href: enlace({ periodo: o.id }) }))} activo={periodo} />
        <Filtro
          etiqueta="Sentido"
          opciones={[
            { id: "todos", titulo: "Los dos", href: enlace({ sentido: null }) },
            ...SENTIDOS_RUTAS.map((o) => ({ ...o, href: enlace({ sentido: o.id }) })),
          ]}
          activo={sentido ?? "todos"}
        />
        {!sentido && <Filtro etiqueta="Ver" opciones={VER_RUTAS.map((o) => ({ ...o, href: enlace({ ver: o.id }) }))} activo={ver} />}
        {datos.choferes.length > 1 || chofer ? (
          <Filtro
            etiqueta="Chofer"
            opciones={[
              { id: "todos", titulo: "Todos", href: enlace({ chofer: null }) },
              ...datos.choferes.map((x) => ({ id: x.id, titulo: x.nombre.split(" ")[0], href: enlace({ chofer: x.id }) })),
            ]}
            activo={chofer ?? "todos"}
          />
        ) : null}
      </div>

      {datos.tramos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center">
          <RouteIcon aria-hidden className="size-8 text-muted-foreground" />
          <p className="font-bold">Todavía no hay recorridos en este período</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {datos.resumen.grabando
              ? "Aparecen cuando los choferes trabajan con la app abierta y el recorrido sube desde su teléfono."
              : "Enciende la grabación: desde ese momento, el recorrido de los choferes se dibuja aquí."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {viajes.size} {viajes.size === 1 ? "viaje" : "viajes"} ·{" "}
            {(Object.keys(SENTIDOS) as Sentido[]).map((x, i) => (
              <span key={x}>
                {i > 0 ? " · " : null}
                <span className="font-bold" style={{ color: COLOR_SENTIDO[x] }}>
                  {SENTIDOS[x].corto} {porSentido(x)}
                </span>
              </span>
            ))}
            {hayFuera && (
              <>
                {" · "}
                <span className="font-bold" style={{ color: COLOR_FUERA_DE_VIAJE }}>
                  fuera de un viaje
                </span>
              </>
            )}
            . Toca una línea para ver de quién es.
          </p>
          <MapaRutas tramos={datos.tramos} />
        </>
      )}
    </div>
  )
}

function Filtro({ etiqueta, opciones, activo }: { etiqueta: string; opciones: { id: string; titulo: string; href: string }[]; activo: string }) {
  return (
    <nav aria-label={etiqueta} className="flex flex-wrap gap-2">
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
