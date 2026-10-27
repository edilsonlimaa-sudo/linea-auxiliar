import { EsqueletoLista, EsqueletoPantalla } from "@/components/nueva/app/esqueletos"
import { Skeleton } from "@/components/nueva/ui/skeleton"

export default function CargandoMenu() {
  return (
    <EsqueletoPantalla titulo="Menú">
      <Skeleton className="h-[5.5rem] rounded-3xl" />
      <EsqueletoLista filas={2} redondo={false} />
      <Skeleton className="h-28 rounded-3xl" />
    </EsqueletoPantalla>
  )
}
