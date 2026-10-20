import { BarraAdmin } from "@/components/admin/barra-admin"
import { MenuAdmin } from "@/components/admin/menu-admin"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { cargarCuentas, cargarResumen, pendientesPorRol } from "@/lib/datos/admin"
import { exigirAdmin } from "@/lib/sesion"

// Panel del admin (§8): menú lateral fijo en la computadora y cajón con "Menú" en el celular.
// Los contadores del menú se recalculan con cada refresco (EnVivo en las páginas que cambian solas).
export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  await exigirAdmin()
  const [{ cuentas }, resumen] = await Promise.all([cargarCuentas(), cargarResumen()])
  const pendientes = pendientesPorRol(cuentas)

  return (
    <SidebarProvider defaultOpen>
      <MenuAdmin
        contadores={{
          choferes: pendientes.chofer,
          pasajeros: pendientes.pasajero,
          enCurso: resumen?.viajes_en_curso ?? 0,
          esperando: resumen?.pasajeros_esperando ?? 0,
        }}
      />
      <SidebarInset>
        <BarraAdmin />
        {/* SidebarInset ya es el <main> */}
        <div className="mx-auto w-full max-w-md px-4 pt-5 pb-12 md:max-w-6xl md:px-8 md:pt-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
