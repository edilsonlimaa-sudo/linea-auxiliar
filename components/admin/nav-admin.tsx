import { CarFrontIcon, LayoutDashboardIcon, UsersIcon } from "lucide-react"
import Link from "next/link"

import type { RolCuenta } from "@/lib/datos/admin"
import { cn } from "@/lib/utils"

type Seccion = "resumen" | "choferes" | "pasajeros"

const SECCIONES = [
  { id: "resumen", titulo: "Resumen", href: "/admin", icono: LayoutDashboardIcon },
  { id: "choferes", titulo: "Choferes", href: "/admin/choferes", icono: CarFrontIcon },
  { id: "pasajeros", titulo: "Pasajeros", href: "/admin/pasajeros", icono: UsersIcon },
] as const

// Pestañas fijas del panel (§8): Resumen · Choferes · Pasajeros, con cuántos esperan aprobación
export function NavAdmin({ activa, pendientes }: { activa: Seccion; pendientes: Record<RolCuenta, number> }) {
  const aviso = { resumen: 0, choferes: pendientes.chofer, pasajeros: pendientes.pasajero }
  return (
    <nav aria-label="Secciones del panel" className="grid grid-cols-3 gap-1 rounded-2xl border-2 bg-card p-1">
      {SECCIONES.map(({ id, titulo, href, icono: Icono }) => {
        const esta = id === activa
        const n = aviso[id]
        return (
          <Link
            key={id}
            href={href}
            aria-current={esta ? "page" : undefined}
            className={cn(
              "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[15px] leading-tight font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              esta ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icono aria-hidden className="size-5" />
            {titulo}
            {n > 0 && (
              <span className="absolute top-1 right-1 flex min-w-6 items-center justify-center rounded-full bg-signal px-1.5 text-sm font-bold text-signal-foreground">
                {n}
                <span className="sr-only"> por revisar</span>
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
