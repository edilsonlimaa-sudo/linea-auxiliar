import { EsqueletoLista, EsqueletoPantalla, EsqueletoTitulo } from "@/components/nueva/app/esqueletos"
import { Skeleton } from "@/components/nueva/ui/skeleton"

// Inicio mientras llega (puede ser "¿Hacia dónde vas?" o Mi viaje: una forma que sirve para los dos)
export default function CargandoInicio() {
  return (
    <EsqueletoPantalla>
      <EsqueletoTitulo />
      <Skeleton className="h-24 rounded-3xl" />
      <Skeleton className="h-24 rounded-3xl" />
      <EsqueletoTitulo />
      <EsqueletoLista filas={2} />
    </EsqueletoPantalla>
  )
}
