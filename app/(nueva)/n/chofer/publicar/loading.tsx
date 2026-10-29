import { EsqueletoPantalla, EsqueletoTarjeta } from "@/components/nueva/app/esqueletos"

export default function CargandoPublicar() {
  return (
    <EsqueletoPantalla titulo="Publicar un viaje" backHref="/n/chofer">
      <EsqueletoTarjeta lineas={1} />
      <EsqueletoTarjeta lineas={1} />
    </EsqueletoPantalla>
  )
}
