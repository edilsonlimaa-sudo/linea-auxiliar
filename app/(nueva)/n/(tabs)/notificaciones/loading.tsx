import { EsqueletoLista, EsqueletoPantalla } from "@/components/nueva/app/esqueletos"

export default function CargandoNotificaciones() {
  return (
    <EsqueletoPantalla titulo="Notificaciones">
      <EsqueletoLista filas={3} redondo={false} />
    </EsqueletoPantalla>
  )
}
