import Link from "next/link"

import { TarjetaCuenta } from "@/components/admin/tarjeta-cuenta"
import { Alert, AlertTitle } from "@/components/ui/alert"
import type { CuentaConActividad, EstadoCuenta, RolCuenta } from "@/lib/datos/admin"
import { firmarFotos } from "@/lib/fotos"
import { cn } from "@/lib/utils"

const PESTANAS = [
  { estado: "pendiente", titulo: "Pendientes" },
  { estado: "aprobado", titulo: "Aprobados" },
  { estado: "rechazado", titulo: "Rechazados" },
] as const

const VACIO: Record<RolCuenta, Record<EstadoCuenta, string>> = {
  chofer: {
    pendiente: "Ningún chofer espera aprobación 🎉",
    aprobado: "Todavía no hay choferes aprobados.",
    rechazado: "No hay choferes rechazados.",
  },
  pasajero: {
    pendiente: "Ningún pasajero espera aprobación 🎉",
    aprobado: "Todavía no hay pasajeros aprobados.",
    rechazado: "No hay pasajeros rechazados.",
  },
}

export const estadoDeParam = (valor?: string): EstadoCuenta =>
  PESTANAS.some((p) => p.estado === valor) ? (valor as EstadoCuenta) : "pendiente"

/** Choferes o Pasajeros del panel (§8): pestañas por estado y la tarjeta de cada cuenta */
export async function ListaCuentas({
  rol,
  estado,
  cuentas,
  error,
}: {
  rol: RolCuenta
  estado: EstadoCuenta
  cuentas: CuentaConActividad[]
  error: string | null
}) {
  const delRol = cuentas.filter((c) => c.rol === rol)
  const lista = delRol.filter((c) => c.estado === estado)
  const cuantas = (e: EstadoCuenta) => delRol.filter((c) => c.estado === e).length
  const base = rol === "chofer" ? "/admin/choferes" : "/admin/pasajeros"
  // Fotos de perfil y del carro para verificar a la persona (R54)
  const fotos = await firmarFotos(lista.flatMap((c) => [c.foto_path, c.foto_carro_path]))

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Estado de las cuentas" className="flex gap-2 overflow-x-auto">
        {PESTANAS.map((p) => {
          const activa = p.estado === estado
          return (
            <Link
              key={p.estado}
              href={`${base}?estado=${p.estado}`}
              aria-current={activa ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-2 px-4 font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                activa ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {p.titulo}
              <span className={cn("tabular-nums", p.estado === "pendiente" && cuantas(p.estado) > 0 && !activa && "text-foreground")}>
                {cuantas(p.estado)}
              </span>
            </Link>
          )
        })}
      </nav>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar las cuentas: {error}</AlertTitle>
        </Alert>
      ) : lista.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-muted-foreground">{VACIO[rol][estado]}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {lista.map((c) => (
            <TarjetaCuenta
              key={c.id}
              cuenta={c}
              fotoUrl={c.foto_path ? (fotos.get(c.foto_path) ?? null) : null}
              fotoCarroUrl={c.foto_carro_path ? (fotos.get(c.foto_carro_path) ?? null) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
