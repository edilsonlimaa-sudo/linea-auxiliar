import { PerfilProvider } from "@/components/nueva/app/perfil"
import { TabBar } from "@/components/nueva/app/tab-bar"
import { firmarFotos } from "@/lib/fotos"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { iniciales } from "@/lib/viajes"

// Las pantallas con la barra de pestañas (§5.21): la barra vive en el layout y no se vuelve a montar al cambiar de
// pestaña. Las de detalle (Al Centro, A Valle Grande, la lista) quedan fuera y la tapan, como en una app.
// El perfil se carga aquí una vez (el layout no se vuelve a pedir al cambiar de pestaña) y lo usa el Menú
export default async function LayoutPestanas({ children }: Readonly<{ children: React.ReactNode }>) {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const fotos = await firmarFotos([perfil.foto_path])
  const fotoUrl = perfil.foto_path ? (fotos.get(perfil.foto_path) ?? null) : null

  return (
    <PerfilProvider perfil={{ nombre: perfil.nombre, iniciales: iniciales(perfil.nombre), urbanismo: perfil.urbanismo, fotoUrl }}>
      {children}
      <TabBar />
    </PerfilProvider>
  )
}
