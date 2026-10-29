import { EsqueletoPantalla, EsqueletoTarjeta } from "@/components/nueva/app/esqueletos"

export default function CargandoAlCentro() {
  return (
    <EsqueletoPantalla titulo="Al Centro" backHref="/n">
      <EsqueletoTarjeta />
      <EsqueletoTarjeta />
    </EsqueletoPantalla>
  )
}
