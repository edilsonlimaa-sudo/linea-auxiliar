import type { Metadata } from "next"

import { SugerenciasLista } from "@/components/admin/sugerencias-lista"
import { Estrellas, promedioTexto } from "@/components/estrellas"
import { cargarSugerenciasAdmin } from "@/lib/datos/sugerencias"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Sugerencias · Administración" }

// Sugerencias y opiniones sobre la app (docs/especificacion.md §5.20, R81–R82)
export default async function PaginaSugerencias() {
  await exigirAdmin()
  const sugerencias = await cargarSugerenciasAdmin()
  const opiniones = sugerencias.filter((s) => s.estrellas !== null)
  const promedio = opiniones.length ? opiniones.reduce((n, s) => n + (s.estrellas ?? 0), 0) / opiniones.length : null
  const sinLeer = sugerencias.filter((s) => !s.leida).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Sugerencias</h1>
        <p className="text-muted-foreground">
          Lo que escriben pasajeros y choferes desde el menú, y su opinión sobre la app.
          {sinLeer > 0 && ` ${sinLeer === 1 ? "1 sin leer" : `${sinLeer} sin leer`}.`}
        </p>
      </div>
      {promedio !== null && (
        <p className="flex flex-wrap items-center gap-2 rounded-2xl border-2 bg-card px-4 py-3">
          <span className="font-bold">La app:</span>
          <Estrellas valor={promedio} />
          <span className="font-bold">{promedioTexto(promedio)}</span>
          <span className="text-muted-foreground">en {opiniones.length === 1 ? "1 opinión" : `${opiniones.length} opiniones`}</span>
        </p>
      )}
      <SugerenciasLista sugerencias={sugerencias} />
    </div>
  )
}
