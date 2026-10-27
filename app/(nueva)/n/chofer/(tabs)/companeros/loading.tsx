import { EsqueletoLista, EsqueletoPantalla } from "@/components/nueva/app/esqueletos"

export default function CargandoCompaneros() {
  return (
    <EsqueletoPantalla titulo="Compañeros">
      <EsqueletoLista filas={3} />
      <EsqueletoLista filas={3} />
    </EsqueletoPantalla>
  )
}
