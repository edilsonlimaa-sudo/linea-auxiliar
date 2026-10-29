import { EsqueletoLista, EsqueletoPantalla, EsqueletoTarjeta, EsqueletoTitulo } from "@/components/nueva/app/esqueletos"

export default function CargandoChofer() {
  return (
    <EsqueletoPantalla titulo="Chofer" backHref="/n/choferes">
      <EsqueletoTarjeta lineas={3} />
      <EsqueletoTitulo />
      <EsqueletoLista filas={2} />
    </EsqueletoPantalla>
  )
}
