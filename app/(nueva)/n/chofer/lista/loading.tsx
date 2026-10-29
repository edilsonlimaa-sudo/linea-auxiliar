import { EsqueletoLista, EsqueletoPantalla } from "@/components/nueva/app/esqueletos"

export default function CargandoListaGina() {
  return (
    <EsqueletoPantalla titulo="La lista en Gina" backHref="/n/chofer">
      <EsqueletoLista filas={4} />
    </EsqueletoPantalla>
  )
}
