import { BarraAdmin } from "@/components/admin/barra-admin"
import { MenuAdmin } from "@/components/admin/menu-admin"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { cargarCuentas, cargarResumen, pendientesPorRol } from "@/lib/datos/admin"
import { contarCuotasEnRevision } from "@/lib/datos/cuota"
import { contarSugerenciasSinLeer } from "@/lib/datos/sugerencias"
import { cargarListaGina } from "@/lib/datos/lista-gina"
import { exigirAdmin } from "@/lib/sesion"

// Panel del admin (§8): menú lateral fijo en la computadora y cajón con "Menú" en el celular.
// Los contadores del menú se recalculan con cada refresco (EnVivo en las páginas que cambian solas).
export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  await exigirAdmin()
  const [{ cuentas }, resumen, lista, cuotas, sugerencias] = await Promise.all([
    cargarCuentas(),
    cargarResumen(),
    cargarListaGina(),
    contarCuotasEnRevision(),
    contarSugerenciasSinLeer(),
  ])
  const pendientes = pendientesPorRol(cuentas)

  return (
    <SidebarProvider defaultOpen>
      <MenuAdmin
        contadores={{
          porAprobar: pendientes.chofer + pendientes.pasajero,
          enCurso: resumen?.viajes_en_curso ?? 0,
          listaGina: lista.reduce((n, e) => n + e.personas, 0),
          cuotas,
          sugerencias,
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
