"use client"

import { HistoryIcon, HouseIcon, IdCardIcon, TicketIcon, UsersIcon, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type Destino = { href: string; titulo: string; icono: LucideIcon }

const MI_VIAJE: Destino = { href: "/mi-viaje", titulo: "Mi viaje", icono: TicketIcon }
const DESTINOS: Destino[] = [
  { href: "/inicio", titulo: "Inicio", icono: HouseIcon },
  { href: "/choferes", titulo: "Choferes", icono: UsersIcon },
  { href: "/mis-viajes", titulo: "Mis viajes", icono: HistoryIcon },
  { href: "/carnet", titulo: "Perfil", icono: IdCardIcon },
]

/** Navegación de abajo de la v2: Mi viaje entra segundo, solo con un viaje en curso (reserva, lista o calificar) */
export function Navegacion({ conViaje }: { conViaje: boolean }) {
  const ruta = usePathname()
  const destinos = conViaje ? [DESTINOS[0], MI_VIAJE, ...DESTINOS.slice(1)] : DESTINOS

  return (
    <nav
      aria-label="Principal"
      className="v2 fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 text-foreground antialiased pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg">
        {destinos.map(({ href, titulo, icono: Icono }) => {
          const activo = ruta === href || (href !== "/inicio" && ruta.startsWith(href))
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
