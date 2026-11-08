import { CarFrontIcon, ExternalLinkIcon, MessageCircleIcon, UsersIcon } from "lucide-react"
import type { Metadata } from "next"

import { buttonVariants } from "@/components/ui/button"
import { cargarInteresados } from "@/lib/datos/interesados"
import { FRECUENCIAS, HORARIOS, RUTAS_NUEVAS } from "@/lib/rutas-nuevas"
import { exigirAdmin } from "@/lib/sesion"
import { formatearTelefono } from "@/lib/telefono"

export const metadata: Metadata = { title: "Interesados · Administración" }

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Caracas" }).format(new Date(iso))

const contar = <T,>(lista: T[], clave: (x: T) => string[]) => {
  const m = new Map<string, number>()
  lista.forEach((x) => clave(x).forEach((k) => m.set(k, (m.get(k) ?? 0) + 1)))
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

// Interesados en una ruta nueva (docs/especificacion.md §5.24, R96–R97). Por ahora solo El Faro
export default async function PaginaInteresados() {
  await exigirAdmin()
  const r = RUTAS_NUEVAS.faro
  const { interesados, error } = await cargarInteresados("faro")
  const pasajeros = interesados.filter((i) => i.rol === "pasajero")
  const choferes = interesados.filter((i) => i.rol === "chofer")
  const porSector = contar(interesados, (i) => [i.sector.trim()])
  const nombreHorario = (id: string) => HORARIOS.find((h) => h.id === id)?.nombre ?? id
  const porHorario = (lista: typeof interesados) => contar(lista, (i) => i.horarios.map(nombreHorario))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">
          Interesados: {r.lugar} ⇄ {r.destino}
        </h1>
        <p className="text-muted-foreground">
          Quienes se anotaron en la página pública{" "}
          <a href="/faro" target="_blank" className="inline-flex items-center gap-1 font-bold text-primary underline underline-offset-4 dark:text-foreground">
            /faro <ExternalLinkIcon aria-hidden className="size-4" />
          </a>
          . No tienen cuenta: escríbeles por WhatsApp.
        </p>
      </div>

      {error ? <p className="rounded-2xl border-2 border-destructive p-4 text-destructive">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 bg-card p-4">
          <UsersIcon aria-hidden className="mb-1 size-5 text-primary" />
          <p className="text-3xl font-bold">{pasajeros.length}</p>
          <p className="text-muted-foreground">{pasajeros.length === 1 ? "pasajero" : "pasajeros"}</p>
        </div>
        <div className="rounded-2xl border-2 bg-card p-4">
          <CarFrontIcon aria-hidden className="mb-1 size-5 text-primary" />
          <p className="text-3xl font-bold">{choferes.length}</p>
          <p className="text-muted-foreground">{choferes.length === 1 ? "chofer" : "choferes"}</p>
        </div>
      </div>

      {interesados.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Resumen titulo="Por microcondominio" filas={porSector} />
          <Resumen titulo="Pasajeros: cuándo viajarían" filas={porHorario(pasajeros)} />
          <Resumen titulo="Choferes: cuándo trabajarían" filas={porHorario(choferes)} />
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Lista ({interesados.length})</h2>
        {interesados.length === 0 ? <p className="text-muted-foreground">Todavía nadie se anotó.</p> : null}
        {interesados.map((i) => (
          <article key={i.id} className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-bold">
                {i.nombre} <span className="font-normal text-muted-foreground">· {i.rol === "chofer" ? "Chofer" : "Pasajero"}</span>
              </p>
              <p className="text-sm text-muted-foreground">{fecha(i.actualizado_en)}</p>
            </div>
            <p className="text-sm">
              <b>{i.sector}</b> · {i.horarios.map(nombreHorario).join(", ") || "sin horario"}
              {i.frecuencia ? ` · ${FRECUENCIAS.find((f) => f.id === i.frecuencia)?.nombre ?? i.frecuencia} por semana` : ""}
              {i.carro ? ` · ${i.carro}` : ""}
            </p>
            {i.comentario ? <p className="text-sm text-muted-foreground italic">“{i.comentario}”</p> : null}
            <a
              href={`https://wa.me/${i.telefono.slice(1)}?text=${encodeURIComponent(`Hola ${i.nombre.split(" ")[0]}, te escribo de la Línea Auxiliar por la ruta ${r.lugar} ⇄ ${r.destino}.`)}`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "whatsapp", size: "sm", className: "w-fit" })}
            >
              <MessageCircleIcon aria-hidden /> {formatearTelefono(i.telefono)}
            </a>
          </article>
        ))}
      </section>
    </div>
  )
}

function Resumen({ titulo, filas }: { titulo: string; filas: [string, number][] }) {
  return (
    <div className="rounded-2xl border-2 bg-card p-4">
      <h2 className="mb-2 font-bold">{titulo}</h2>
      {filas.length === 0 ? <p className="text-sm text-muted-foreground">Nadie todavía</p> : null}
      <ul className="flex flex-col gap-1 text-sm">
        {filas.map(([k, n]) => (
          <li key={k} className="flex justify-between gap-2">
            <span className="truncate">{k}</span>
            <b>{n}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
