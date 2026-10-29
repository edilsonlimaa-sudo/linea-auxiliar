import { EsqueletoPantalla, EsqueletoTarjeta } from "@/components/nueva/app/esqueletos"

export default function CargandoCuota() {
  return (
    <EsqueletoPantalla titulo="Cuota del día" backHref="/n/chofer">
      <EsqueletoTarjeta lineas={3} />
    </EsqueletoPantalla>
  )
}
