import { ChevronRightIcon, SearchIcon, StarIcon } from "lucide-react"
import Link from "next/link"

import { promedioTexto } from "@/components/estrellas"
import { Avatar } from "@/components/foto/avatar"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { RolCuenta } from "@/lib/datos/admin"
import type { FilaPersona } from "@/lib/datos/personas-admin"
import { hace } from "@/lib/fechas"

/**
 * Choferes o Pasajeros del panel (§8): los aprobados, con búsqueda (formulario GET: funciona sin JavaScript) y una fila
 * corta por persona que abre su detalle.
 */
export function ListaPersonas({
  rol,
  personas,
  total,
  busqueda,
  error,
}: {
  rol: RolCuenta
  personas: FilaPersona[]
  total: number
  busqueda: string
  error: string | null
}) {
  const base = rol === "chofer" ? "/admin/choferes" : "/admin/pasajeros"
  const ayuda = rol === "chofer" ? "Nombre, teléfono, cédula, placa o unidad" : "Nombre, teléfono, cédula o dónde vive"

  return (
    <div className="flex flex-col gap-4">
      <form action={base} role="search" className="flex gap-2">
        <label htmlFor="buscar" className="sr-only">
          Buscar
        </label>
        <div className="relative flex-1">
          <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input id="buscar" name="q" type="search" defaultValue={busqueda} placeholder={ayuda} className="pl-10" />
        </div>
        <Button type="submit">Buscar</Button>
      </form>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {busqueda
          ? `${personas.length === 1 ? "1 resultado" : `${personas.length} resultados`} para «${busqueda}» de ${total}`
          : `${total} ${rol === "chofer" ? (total === 1 ? "chofer aprobado" : "choferes aprobados") : total === 1 ? "pasajero aprobado" : "pasajeros aprobados"}`}
        {busqueda && (
          <>
            {" · "}
            <Link href={base} className="font-bold text-primary underline-offset-4 hover:underline">
              Ver todos
            </Link>
          </>
        )}
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar las cuentas: {error}</AlertTitle>
        </Alert>
      ) : personas.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-muted-foreground">
          {busqueda ? "Nadie coincide con esa búsqueda." : rol === "chofer" ? "Todavía no hay choferes aprobados." : "Todavía no hay pasajeros aprobados."}
        </p>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {personas.map((p) => (
            <li key={p.id}>
              <Link
                href={`${base}/${p.id}`}
                className="flex items-center gap-3 rounded-2xl border-2 bg-card p-3 outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <Avatar url={p.fotoUrl} nombre={p.nombre} className="size-12" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 font-bold">
                    <span className="truncate">{p.nombre}</span>
                    {rol === "chofer" && p.actividad?.conectado && (
                      <span className="inline-flex items-center gap-1 text-sm text-success">
                        <span aria-hidden className="size-2 rounded-full bg-success" /> Conectado
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                    {rol === "chofer" ? (
                      <>
                        {p.placa && <span className="font-mono font-bold tracking-wider text-foreground">{p.placa}</span>}
                        {p.actividad?.estrellas != null && Number(p.actividad.calificaciones) > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <StarIcon aria-hidden className="size-3.5 fill-signal text-signal" />
                            {promedioTexto(Number(p.actividad.estrellas))}
                          </span>
                        )}
                      </>
                    ) : (
                      p.urbanismo && <span className="truncate">{p.urbanismo}</span>
                    )}
                    <span>{p.actividad?.viajes === 1 ? "1 viaje" : `${p.actividad?.viajes ?? 0} viajes`}</span>
                    <span>{p.actividad?.ultimo_viaje ? `último ${hace(p.actividad.ultimo_viaje)}` : "sin viajes"}</span>
                  </span>
                </span>
                <ChevronRightIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** "← Choferes": volver a la lista desde el detalle */
export function VolverALista({ rol }: { rol: RolCuenta }) {
  return (
    <Link href={rol === "chofer" ? "/admin/choferes" : "/admin/pasajeros"} className={buttonVariants({ variant: "ghost", className: "self-start" })}>
      ← {rol === "chofer" ? "Choferes" : "Pasajeros"}
    </Link>
  )
}
