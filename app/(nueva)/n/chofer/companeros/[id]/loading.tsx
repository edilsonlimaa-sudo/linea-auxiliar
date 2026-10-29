import { EsqueletoLista, EsqueletoPantalla, EsqueletoTarjeta } from "@/components/nueva/app/esqueletos"

export default function CargandoCompanero() {
  return (
    <EsqueletoPantalla titulo="Compañero" backHref="/n/chofer/companeros">
      <EsqueletoTarjeta lineas={3} />
      <EsqueletoLista filas={2} redondo={false} />
    </EsqueletoPantalla>
  )
}
