"use client"

import {
  BanknoteIcon,
  BarChart3Icon,
  BellIcon,
  ChartColumnIcon,
  BusIcon,
  CarFrontIcon,
  KeyRoundIcon,
  LightbulbIcon,
  LayoutDashboardIcon,
  ListOrderedIcon,
  LogOutIcon,
  MoonIcon,
  RouteIcon,
  StarIcon,
  SunIcon,
  UserCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { salirAdmin } from "@/lib/acciones/admin"
import { apagarAvisosDeEsteCelular } from "@/lib/avisos-celular"
import { cn } from "@/lib/utils"

/** Contadores del menú: los que piden acción (aprobar) van en amarillo; los que informan, en gris */
export type ContadoresAdmin = { porAprobar: number; enCurso: number; listaGina: number; cuotas: number; sugerencias: number }

type Destino = { href: string; titulo: string; icono: LucideIcon; contador?: keyof ContadoresAdmin; accion?: boolean }

// Menú del panel agrupado por tema (docs/especificacion.md §8, "Panel del admin")
const GRUPOS: { titulo?: string; destinos: Destino[] }[] = [
  { destinos: [{ href: "/admin", titulo: "Resumen", icono: LayoutDashboardIcon }] },
  {
    titulo: "Operación",
    destinos: [
      { href: "/admin/viajes", titulo: "Viajes en curso", icono: BusIcon, contador: "enCurso" },
      { href: "/admin/lista-gina", titulo: "Lista a Valle Grande", icono: ListOrderedIcon, contador: "listaGina" },
      { href: "/admin/notificaciones", titulo: "Notificaciones", icono: BellIcon },
    ],
  },
  {
    titulo: "Personas",
    destinos: [
      { href: "/admin/aprobar", titulo: "Por aprobar", icono: UserCheckIcon, contador: "porAprobar", accion: true },
      { href: "/admin/choferes", titulo: "Choferes", icono: CarFrontIcon },
      { href: "/admin/pasajeros", titulo: "Pasajeros", icono: UsersIcon },
      { href: "/admin/cuotas", titulo: "Cuotas", icono: BanknoteIcon, contador: "cuotas", accion: true },
    ],
  },
  {
    titulo: "Análisis",
    destinos: [
      { href: "/admin/uso", titulo: "Uso de la app", icono: BarChart3Icon },
      { href: "/admin/demanda", titulo: "Demanda y oferta", icono: ChartColumnIcon },
      { href: "/admin/rutas", titulo: "Rutas", icono: RouteIcon },
      { href: "/admin/calificaciones", titulo: "Calificaciones", icono: StarIcon },
      { href: "/admin/sugerencias", titulo: "Sugerencias", icono: LightbulbIcon, contador: "sugerencias", accion: true },
    ],
  },
]

const suscribirse = () => () => {}

export function MenuAdmin({ contadores }: { contadores: ContadoresAdmin }) {
  const ruta = usePathname()
  const { setOpenMobile } = useSidebar()
  const { resolvedTheme, setTheme } = useTheme()
  const montado = useSyncExternalStore(suscribirse, () => true, () => false)
  const oscuro = montado && resolvedTheme === "dark"
  const cerrar = () => setOpenMobile(false)
  // Activo: el destino más largo que contiene la ruta (el detalle de un chofer marca "Choferes"; Viajes terminados no
  // marca también Viajes en curso)
  const activoHref = GRUPOS.flatMap((g) => g.destinos.map((d) => d.href))
    .filter((h) => ruta === h || (h !== "/admin" && ruta.startsWith(`${h}/`)))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <Sidebar>
      <SidebarHeader className="border-b-4 border-signal bg-header p-4 text-header-foreground">
        <Link href="/admin" onClick={cerrar} className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
          {/* eslint-disable-next-line @next/next/no-img-element -- ícono SVG local */}
          <img src="/icon.svg" alt="" width={40} height={40} className="size-10 rounded-[10px]" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-bold">Línea Auxiliar</span>
            <span className="block truncate text-sm opacity-90">Administración</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {GRUPOS.map((g, i) => (
          <SidebarGroup key={g.titulo ?? i}>
            {g.titulo && <SidebarGroupLabel className="text-sm font-bold tracking-wide uppercase">{g.titulo}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {g.destinos.map(({ href, titulo, icono: Icono, contador, accion }) => {
                  const activo = href === activoHref
                  const n = contador ? contadores[contador] : 0
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        isActive={activo}
                        render={<Link href={href} onClick={cerrar} aria-current={activo ? "page" : undefined} />}
                        className="font-bold data-active:bg-secondary data-active:text-secondary-foreground"
                      >
                        <Icono aria-hidden />
                        {titulo}
                        {n > 0 && (
                          <span
                            className={cn(
                              "ml-auto min-w-6 rounded-full px-2 py-0.5 text-center text-sm font-bold tabular-nums",
                              accion ? "bg-signal text-signal-foreground" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {n}
                            <span className="sr-only">{accion ? " por aprobar" : ""}</span>
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={ruta === "/admin/clave"}
              render={<Link href="/admin/clave" onClick={cerrar} />}
            >
              <KeyRoundIcon aria-hidden />
              Cambiar contraseña
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setTheme(oscuro ? "light" : "dark")}>
              {oscuro ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
              {oscuro ? "Modo claro" : "Modo oscuro"}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            {/* R93: al salir, este aparato deja de avisar de las cuentas nuevas */}
            <form action={async () => (await apagarAvisosDeEsteCelular().catch(() => {}), await salirAdmin())}>
              <SidebarMenuButton type="submit" className="text-destructive hover:text-destructive">
                <LogOutIcon aria-hidden />
                Salir del panel
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
