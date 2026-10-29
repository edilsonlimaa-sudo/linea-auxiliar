import { EsqueletoLista, EsqueletoPantalla, EsqueletoTarjeta, EsqueletoTitulo } from "@/components/nueva/app/esqueletos"

export default function CargandoAValleGrande() {
  return (
    <EsqueletoPantalla titulo="A Valle Grande" backHref="/n">
      <EsqueletoTarjeta lineas={1} />
      <EsqueletoTitulo />
      <EsqueletoLista filas={2} redondo={false} />
    </EsqueletoPantalla>
  )
}
