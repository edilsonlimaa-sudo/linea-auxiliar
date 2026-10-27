import { EsqueletoLista, EsqueletoPantalla } from "@/components/nueva/app/esqueletos"
import { Skeleton } from "@/components/nueva/ui/skeleton"

export default function CargandoCalificaciones() {
  return (
    <EsqueletoPantalla titulo="Calificaciones">
      <Skeleton className="h-36 rounded-3xl" />
      <EsqueletoLista filas={3} redondo={false} />
    </EsqueletoPantalla>
  )
}
