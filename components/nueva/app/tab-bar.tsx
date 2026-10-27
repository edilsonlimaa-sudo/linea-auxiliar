"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, CarFront, History, House, Menu, Star } from "lucide-react"

import { cn } from "@/lib/utils"

export type Tab = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  /** Página sem dados próprios: carrega inteira antes do toque (abre na hora) */
  fija?: boolean
}

/** Abas do app do passageiro (padrão). */
export const tabsPasajero: Tab[] = [
  { href: "/n", label: "Inicio", icon: House },
  { href: "/n/choferes", label: "Choferes", icon: CarFront },
  { href: "/n/viajes", label: "Mis viajes", icon: History },
  { href: "/n/notificaciones", label: "Notificaciones", icon: Bell },
  { href: "/n/menu", label: "Menú", icon: Menu, fija: true },
]

/** Abas do chofer (§5.21) */
export const tabsChofer: Tab[] = [
  { href: "/n/chofer", label: "Inicio", icon: House },
  { href: "/n/chofer/viajes", label: "Mis viajes", icon: History },
  { href: "/n/chofer/calificaciones", label: "Calificaciones", icon: Star },
  { href: "/n/chofer/menu", label: "Menú", icon: Menu, fija: true },
]

function coincide(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Barra inferior. A aba ativa é a de href mais específico que casa com a
 * URL, então "/chofer" não fica ativa em "/chofer/viajes".
 */
export function TabBar({
  tabs: propias,
  para = "pasajero",
  contadores = {},
}: {
  tabs?: Tab[]
  para?: "pasajero" | "chofer" // desde un Server Component: los íconos no pasan como props
  contadores?: Record<string, number>
}) {
  const pathname = usePathname()
  const tabs = propias ?? (para === "chofer" ? tabsChofer : tabsPasajero)
  const activa = tabs
    .filter((t) => coincide(pathname, t.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <nav
      aria-label="Navegación principal"
      style={{ viewTransitionName: "tab-bar" }}
      className="sticky bottom-0 z-20 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="flex h-16 items-stretch">
        {tabs.map(({ href, label, icon: Icon, fija }) => {
          const active = href === activa
          const contador = contadores[href] ?? 0
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                prefetch={fija ? true : undefined}
                aria-current={active ? "page" : undefined}
                aria-label={contador > 0 ? `${label}, ${contador} sin leer` : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative">
                  <Icon
                    className="size-6"
                    strokeWidth={active ? 2.25 : 1.75}
                    aria-hidden
                  />
                  {contador > 0 ? (
                    <span
                      aria-hidden
                      className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] leading-none font-semibold text-primary-foreground tabular-nums ring-2 ring-background"
                    >
                      {contador > 9 ? "9+" : contador}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
