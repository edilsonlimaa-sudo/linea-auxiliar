"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CarFront, History, House, Menu } from "lucide-react"

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
  { href: "/n/menu", label: "Menú", icon: Menu, fija: true },
]

function coincide(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Barra inferior. A aba ativa é a de href mais específico que casa com a
 * URL, então "/chofer" não fica ativa em "/chofer/viajes".
 */
export function TabBar({ tabs = tabsPasajero }: { tabs?: Tab[] }) {
  const pathname = usePathname()
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
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                prefetch={fija ? true : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className="size-6"
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
