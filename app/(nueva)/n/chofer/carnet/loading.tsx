import { EsqueletoPantalla, EsqueletoTarjeta } from "@/components/nueva/app/esqueletos"

export default function CargandoCarnetChofer() {
  return (
    <EsqueletoPantalla titulo="Mi carnet" backHref="/n/chofer/menu">
      <EsqueletoTarjeta lineas={3} />
      <EsqueletoTarjeta lineas={2} />
    </EsqueletoPantalla>
  )
}
