import { EsqueletoLista, EsqueletoPantalla, EsqueletoTitulo } from "@/components/nueva/app/esqueletos"
import { Skeleton } from "@/components/nueva/ui/skeleton"

export default function CargandoChoferes() {
  return (
    <EsqueletoPantalla titulo="Choferes">
      <Skeleton className="h-4 w-4/5" />
      <EsqueletoTitulo />
      <EsqueletoLista filas={3} />
    </EsqueletoPantalla>
  )
}
