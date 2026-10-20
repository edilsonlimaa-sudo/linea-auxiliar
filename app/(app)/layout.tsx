import { BarraApp } from "@/components/app/barra-app"
import { MenuLateral } from "@/components/app/menu-lateral"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { tieneEsperaActiva, tieneViajeEnCurso } from "@/lib/datos/inicio-pasajero"
import { firmarFotos } from "@/lib/fotos"
import { exigirCuentaAprobada } from "@/lib/sesion"

// App de pasajeros y choferes: menú lateral (drawer en el celular) + barra con el botón "Menú"
export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const perfil = await exigirCuentaAprobada()
  const rol = perfil.rol === "chofer" ? "chofer" : "pasajero"
  const [conViaje, conEspera, fotos] = await Promise.all([
    rol === "pasajero" ? tieneViajeEnCurso(perfil.id) : false,
    rol === "pasajero" ? tieneEsperaActiva(perfil.id) : false,
    firmarFotos([perfil.foto_path]),
  ])
  const fotoUrl = perfil.foto_path ? (fotos.get(perfil.foto_path) ?? null) : null

  return (
    // Cerrado por defecto: en el celular es un drawer; en pantallas grandes se abre con "Menú"
    <SidebarProvider defaultOpen={false}>
      <MenuLateral nombre={perfil.nombre} rol={rol} conViaje={conViaje} conEspera={conEspera} fotoUrl={fotoUrl} />
      <SidebarInset>
        <BarraApp />
        {/* SidebarInset ya es el <main> */}
        <div className="mx-auto w-full max-w-2xl px-4 pt-5 pb-12">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
