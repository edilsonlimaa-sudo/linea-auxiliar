import { TabBar } from "@/components/nueva/app/tab-bar"

// Las pantallas del chofer con la barra de pestañas (§5.21). Las de un solo paso (Publicar, Cuota, la lista de Gina)
// quedan fuera y la tapan, como en una app
export default function LayoutPestanasChofer({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <TabBar para="chofer" />
    </>
  )
}
