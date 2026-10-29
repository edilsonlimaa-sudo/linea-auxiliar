import { EsqueletoLista, EsqueletoPantalla, EsqueletoTarjeta } from "@/components/nueva/app/esqueletos"

export default function CargandoViajeChofer() {
  return (
    <EsqueletoPantalla titulo="Viaje" backHref="/n/chofer/viajes">
      <EsqueletoTarjeta lineas={3} />
      <EsqueletoLista filas={2} />
    </EsqueletoPantalla>
  )
}
