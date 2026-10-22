"use client"

import { HistoryIcon, HouseIcon, IdCardIcon, UsersIcon, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type Destino = { href: string; titulo: string; icono: LucideIcon }

const DESTINOS: Destino[] = [
  { href: "/v2", titulo: "Inicio", icono: HouseIcon },
  { href: "/v2/choferes", titulo: "Choferes", icono: UsersIcon },
  { href: "/v2/mis-viajes", titulo: "Mis viajes", icono: HistoryIcon },
  { href: "/v2/perfil", titulo: "Perfil", icono: IdCardIcon },
]

/** Navegación de abajo de la v2 (solo rutas de /v2) */
export function Navegacion() {
  const ruta = usePathname()

  return (
    <nav
      aria-label="Principal"
      className="v2 fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 text-foreground antialiased pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg">
        {DESTINOS.map(({ href, titulo, icono: Icono }) => {
          const activo = ruta === href || (href !== "/v2" && ruta.startsWith(`${href}/`))
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  activo ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icono aria-hidden className={cn("size-5", activo && "stroke-[2.5]")} />
                {titulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
