import Link from "next/link"

import { TarjetaCuenta } from "@/components/admin/tarjeta-cuenta"
import { Alert, AlertTitle } from "@/components/ui/alert"
import type { CuentaConActividad, RolCuenta } from "@/lib/datos/admin"
import { firmarFotos } from "@/lib/fotos"
import { cn } from "@/lib/utils"

export type EstadoPorAprobar = "pendiente" | "rechazado"
export type FiltroRol = "todos" | RolCuenta

const ESTADOS: { id: EstadoPorAprobar; titulo: string }[] = [
  { id: "pendiente", titulo: "Pendientes" },
  { id: "rechazado", titulo: "Rechazados" },
]
const ROLES: { id: FiltroRol; titulo: string }[] = [
  { id: "todos", titulo: "Todos" },
  { id: "chofer", titulo: "Choferes" },
  { id: "pasajero", titulo: "Pasajeros" },
]

export const estadoDeParam = (v?: string): EstadoPorAprobar => (v === "rechazado" ? "rechazado" : "pendiente")
export const rolDeParam = (v?: string): FiltroRol => (v === "chofer" || v === "pasajero" ? v : "todos")

const enlace = (estado: EstadoPorAprobar, rol: FiltroRol) => `/admin/aprobar?estado=${estado}${rol !== "todos" ? `&rol=${rol}` : ""}`

/**
 * Por aprobar (§8): las cuentas nuevas de los dos roles (pendientes o rechazadas), con la tarjeta para verificar a la
 * persona (R2, R5) y sus acciones. Las más viejas primero: llevan más tiempo esperando.
 */
export async function ListaPorAprobar({
  estado,
  rol,
  cuentas,
  error,
}: {
  estado: EstadoPorAprobar
  rol: FiltroRol
  cuentas: CuentaConActividad[]
  error: string | null
}) {
  const delEstado = (e: EstadoPorAprobar) => cuentas.filter((c) => c.estado === e && (c.rol === "chofer" || c.rol === "pasajero"))
  const cuantas = (e: EstadoPorAprobar) => delEstado(e).filter((c) => rol === "todos" || c.rol === rol).length
  const lista = delEstado(estado)
    .filter((c) => rol === "todos" || c.rol === rol)
    .sort((a, b) => a.creado_en.localeCompare(b.creado_en))
  const porRol = (r: RolCuenta) => delEstado(estado).filter((c) => c.rol === r).length
  // Fotos de perfil y del carro para verificar a la persona (R54)
  const fotos = await firmarFotos(lista.flatMap((c) => [c.foto_path, c.foto_carro_path]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Chips
          titulo="Estado"
          opciones={ESTADOS.map((e) => ({ ...e, cuantas: cuantas(e.id), destacar: e.id === "pendiente" }))}
          activo={estado}
          href={(id) => enlace(id, rol)}
        />
        <Chips
          titulo="Rol"
          opciones={ROLES.map((r) => ({ ...r, cuantas: r.id === "todos" ? delEstado(estado).length : porRol(r.id) }))}
          activo={rol}
          href={(id) => enlace(estado, id)}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar las cuentas: {error}</AlertTitle>
        </Alert>
      ) : lista.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-muted-foreground">
          {estado === "pendiente" ? "Nadie espera aprobación 🎉" : "No hay cuentas rechazadas."}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {lista.map((c) => (
            <TarjetaCuenta
              key={c.id}
              cuenta={c}
              fotoUrl={c.foto_path ? (fotos.get(c.foto_path) ?? null) : null}
              fotoCarroUrl={c.foto_carro_path ? (fotos.get(c.foto_carro_path) ?? null) : null}
              conRol
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Chips<T extends string>({
  titulo,
  opciones,
  activo,
  href,
}: {
  titulo: string
  opciones: { id: T; titulo: string; cuantas: number; destacar?: boolean }[]
  activo: T
  href: (id: T) => string
}) {
  return (
    <nav aria-label={titulo} className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const activa = o.id === activo
        return (
          <Link
            key={o.id}
            href={href(o.id)}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              activa ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {o.titulo}
            <span className={cn("tabular-nums", o.destacar && o.cuantas > 0 && !activa && "text-foreground")}>{o.cuantas}</span>
          </Link>
        )
      })}
    </nav>
  )
}
