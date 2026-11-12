import { EsqueletoPantalla, EsqueletoTarjeta } from "@/components/nueva/app/esqueletos"

export default function CargandoSalidaFija() {
  return (
    <EsqueletoPantalla titulo="Salida fija de las 5" backHref="/n">
      <EsqueletoTarjeta lineas={4} />
      <EsqueletoTarjeta lineas={3} />
      <EsqueletoTarjeta lineas={2} />
    </EsqueletoPantalla>
  )
}
