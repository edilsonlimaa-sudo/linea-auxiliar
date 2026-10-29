import { EsqueletoPantalla, EsqueletoTarjeta } from "@/components/nueva/app/esqueletos"

export default function CargandoCarnet() {
  return (
    <EsqueletoPantalla titulo="Mi carnet" backHref="/n/menu">
      <EsqueletoTarjeta lineas={3} />
    </EsqueletoPantalla>
  )
}
