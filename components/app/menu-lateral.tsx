"use client"

import {
  BadgeCheckIcon,
  HistoryIcon,
  HouseIcon,
  IdCardIcon,
  LogOutIcon,
  MoonIcon,
  StarIcon,
  SunIcon,
  TicketIcon,
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { salir } from "@/lib/acciones/cuenta"
import { iniciales } from "@/lib/viajes"

type Destino = { href: string; titulo: string; icono: LucideIcon; destacado?: boolean }

// Solo con reserva activa: va de primero porque es lo que la persona está haciendo ahora (docs/especificacion.md §8)
const MI_VIAJE: Destino = { href: "/mi-viaje", titulo: "Mi viaje", icono: TicketIcon, destacado: true }

// Destinos por rol (docs/especificacion.md §8)
const DESTINOS: Record<"pasajero" | "chofer", Destino[]> = {
  pasajero: [
    { href: "/inicio", titulo: "Inicio", icono: HouseIcon },
    { href: "/choferes", titulo: "Choferes", icono: UsersIcon },
    { href: "/mis-viajes", titulo: "Mis viajes", icono: HistoryIcon },
    { href: "/carnet", titulo: "Mi carnet", icono: IdCardIcon },
  ],
  chofer: [
    { href: "/inicio", titulo: "Inicio", icono: HouseIcon },
    { href: "/mis-viajes", titulo: "Mis viajes", icono: HistoryIcon },
    { href: "/calificaciones", titulo: "Mis calificaciones", icono: StarIcon },
    { href: "/carnet", titulo: "Mi carnet", icono: IdCardIcon },
  ],
}

const suscribirse = () => () => {}

export function MenuLateral({
  nombre,
  rol,
  conViaje = false,
  fotoUrl = null,
}: {
  nombre: string
  rol: "pasajero" | "chofer"
  conViaje?: boolean
  fotoUrl?: string | null // foto de perfil (R54)
}) {
  const ruta = usePathname()
  const { setOpenMobile } = useSidebar()
  const { resolvedTheme, setTheme } = useTheme()
  const montado = useSyncExternalStore(suscribirse, () => true, () => false)
  const oscuro = montado && resolvedTheme === "dark"
  const cerrar = () => setOpenMobile(false)
  const destinos = conViaje ? [MI_VIAJE, ...DESTINOS[rol]] : DESTINOS[rol]

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 border-b-4 border-signal bg-header p-4 text-header-foreground">
        <div className="flex items-center gap-3">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- enlace firmado de Supabase Storage (R54)
            <img src={fotoUrl} alt="" className="size-14 shrink-0 rounded-full object-cover ring-2 ring-header-foreground/30" />
          ) : (
            <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-header-foreground/15 text-xl font-bold">
              {iniciales(nombre)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg leading-tight font-bold">{nombre}</p>
            <p className="flex items-center gap-1 text-[15px] opacity-90">
              {rol === "chofer" ? "Chofer" : "Pasajero"} · <BadgeCheckIcon aria-hidden className="size-4" /> Verificado
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {destinos.map(({ href, titulo, icono: Icono, destacado }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={ruta === href}
                    render={<Link href={href} onClick={cerrar} aria-current={ruta === href ? "page" : undefined} />}
                    className="font-bold data-active:bg-secondary data-active:text-secondary-foreground"
                  >
                    <Icono aria-hidden />
                    {titulo}
                    {destacado && (
                      <span className="ml-auto rounded-full bg-signal px-2 py-0.5 text-sm font-bold text-signal-foreground">En curso</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setTheme(oscuro ? "light" : "dark")}>
              {oscuro ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
              {oscuro ? "Modo claro" : "Modo oscuro"}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={salir}>
              <SidebarMenuButton type="submit" className="text-destructive hover:text-destructive">
                <LogOutIcon aria-hidden />
                Salir
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
