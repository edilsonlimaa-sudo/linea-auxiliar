import { TabBar } from "@/components/nueva/app/tab-bar"

// Las pantallas con la barra de pestañas (§5.21): la barra vive en el layout y no se vuelve a montar al cambiar de
// pestaña. Las de detalle (Al Centro, A Valle Grande, la lista) quedan fuera y la tapan, como en una app
export default function LayoutPestanas({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <TabBar />
    </>
  )
}
