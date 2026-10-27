import { EsqueletoLista, EsqueletoPantalla } from "@/components/nueva/app/esqueletos"

export default function CargandoViajesChofer() {
  return (
    <EsqueletoPantalla titulo="Mis viajes">
      <EsqueletoLista filas={4} redondo={false} />
    </EsqueletoPantalla>
  )
}
