import { EsqueletoLista, EsqueletoPantalla } from "@/components/nueva/app/esqueletos"
import { Skeleton } from "@/components/nueva/ui/skeleton"

export default function CargandoMisNumeros() {
  return (
    <EsqueletoPantalla titulo="Mis números">
      <Skeleton className="h-11 rounded-full" />
      <Skeleton className="h-36 rounded-3xl" />
      <EsqueletoLista filas={3} redondo={false} />
    </EsqueletoPantalla>
  )
}
