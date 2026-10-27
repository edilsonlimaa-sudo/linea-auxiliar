import { EsqueletoLista, EsqueletoPantalla } from "@/components/nueva/app/esqueletos"

export default function CargandoViajesChofer() {
  return (
    <EsqueletoPantalla titulo="Viajes">
      <EsqueletoLista filas={4} redondo={false} />
    </EsqueletoPantalla>
  )
}
