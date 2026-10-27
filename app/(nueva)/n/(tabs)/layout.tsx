import { CampanaEnVivo } from "@/components/nueva/app/campana-en-vivo"
import { PerfilProvider } from "@/components/nueva/app/perfil"
import { TabBar } from "@/components/nueva/app/tab-bar"
import { contarNoLeidas } from "@/lib/datos/notificaciones"
import { firmarFotos } from "@/lib/fotos"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { iniciales } from "@/lib/viajes"

// Las pantallas con la barra de pestañas (§5.21): la barra vive en el layout y no se vuelve a montar al cambiar de
// pestaña. Las de detalle (Al Centro, A Valle Grande, la lista) quedan fuera y la tapan, como en una app.
// El perfil se carga aquí una vez (el layout no se vuelve a pedir al cambiar de pestaña) y lo usa el Menú. El número de la
// campana (R89) también: CampanaEnVivo lo mantiene al día en cualquier pestaña
export default async function LayoutPestanas({ children }: Readonly<{ children: React.ReactNode }>) {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const [fotos, noLeidas] = await Promise.all([firmarFotos([perfil.foto_path]), contarNoLeidas(perfil.id)])
  const fotoUrl = perfil.foto_path ? (fotos.get(perfil.foto_path) ?? null) : null

  return (
    <PerfilProvider perfil={{ nombre: perfil.nombre, iniciales: iniciales(perfil.nombre), urbanismo: perfil.urbanismo, fotoUrl }}>
      {children}
      <CampanaEnVivo personaId={perfil.id} />
      <TabBar contadores={{ "/n/notificaciones": noLeidas }} />
    </PerfilProvider>
  )
}
