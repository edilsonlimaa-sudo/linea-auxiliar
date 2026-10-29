import { EsqueletoLista, EsqueletoPantalla, EsqueletoTarjeta } from "@/components/nueva/app/esqueletos"

export default function CargandoViaje() {
  return (
    <EsqueletoPantalla titulo="Viaje" backHref="/n/viajes">
      <EsqueletoTarjeta lineas={3} />
      <EsqueletoLista filas={1} />
    </EsqueletoPantalla>
  )
}
