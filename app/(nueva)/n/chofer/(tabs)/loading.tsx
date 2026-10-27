import { EsqueletoPantalla } from "@/components/nueva/app/esqueletos"
import { Skeleton } from "@/components/nueva/ui/skeleton"

// Inicio del chofer mientras llega
export default function CargandoInicioChofer() {
  return (
    <EsqueletoPantalla>
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-20 rounded-3xl" />
      <Skeleton className="h-16 rounded-3xl" />
    </EsqueletoPantalla>
  )
}
