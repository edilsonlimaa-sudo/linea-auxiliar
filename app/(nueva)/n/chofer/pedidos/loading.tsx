import { EsqueletoLista, EsqueletoPantalla } from "@/components/nueva/app/esqueletos"

export default function CargandoPedidos() {
  return (
    <EsqueletoPantalla titulo="Esperando en Valle Grande" backHref="/n/chofer">
      <EsqueletoLista filas={3} />
    </EsqueletoPantalla>
  )
}
