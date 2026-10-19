import { BadgeCheckIcon, ChevronRightIcon } from "lucide-react"
import Link from "next/link"

import { Estrellas, promedioTexto } from "@/components/estrellas"
import type { Carnet } from "@/lib/datos/historial"
import { fechaLarga } from "@/lib/fechas"
import { formatearTelefono } from "@/lib/telefono"
import { iniciales } from "@/lib/viajes"

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{etiqueta}</dt>
      <dd className="text-lg">{children}</dd>
    </div>
  )
}

/**
 * Mi carnet (R53): la credencial de la línea, para mostrar si se la piden. Se parece a un carnet de verdad
 * (franja de la línea, nombre grande, verificado) y para el chofer destaca la placa.
 */
export function CarnetVista({ carnet }: { carnet: Carnet }) {
  const { perfil, telefono, cedula, vehiculo, estrellas } = carnet
  const esChofer = perfil.rol === "chofer"

  return (
    <div className="flex flex-col gap-5">
      <article aria-label="Carnet de la Línea Auxiliar" className="overflow-hidden rounded-3xl border-2 border-primary bg-card shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b-4 border-signal bg-header px-5 py-3 text-header-foreground">
          <span className="leading-tight">
            <span className="block font-bold">Línea Auxiliar</span>
            <span className="block text-sm opacity-90">Valle Grande</span>
          </span>
          <span className="rounded-full bg-header-foreground/15 px-3 py-1 text-sm font-bold">{esChofer ? "Chofer" : "Pasajero"}</span>
        </header>

        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-center gap-4">
            <span aria-hidden className="grid size-20 shrink-0 place-items-center rounded-2xl bg-secondary text-3xl font-bold text-secondary-foreground">
              {iniciales(perfil.nombre)}
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl leading-tight font-bold">{perfil.nombre}</h1>
              <p className="mt-1 flex items-center gap-1.5 font-bold text-success">
                <BadgeCheckIcon aria-hidden className="size-5" />
                Verificado
              </p>
              {perfil.aprobado_en && <p className="text-[15px] text-muted-foreground">desde el {fechaLarga(perfil.aprobado_en)}</p>}
            </div>
          </div>

          {esChofer && vehiculo && (
            <div className="flex flex-col items-center gap-1 rounded-2xl bg-muted px-4 py-4 text-center">
              <span className="rounded-lg border-[3px] border-foreground bg-card px-4 py-1 font-mono text-3xl font-bold tracking-[0.2em]">
                {vehiculo.placa}
              </span>
              <span className="text-lg">
                {[vehiculo.modelo, vehiculo.color].filter(Boolean).join(" · ")}
                {vehiculo.unidad && <strong> · Unidad {vehiculo.unidad}</strong>}
              </span>
            </div>
          )}

          <dl className="grid gap-4 sm:grid-cols-2">
            {telefono && <Dato etiqueta="Teléfono">{formatearTelefono(telefono)}</Dato>}
            {cedula && <Dato etiqueta="Cédula">{cedula}</Dato>}
            {!esChofer && perfil.urbanismo && <Dato etiqueta="Vive en">{perfil.urbanismo}</Dato>}
          </dl>
        </div>
      </article>

      {esChofer && (
        <Link
          href="/calificaciones"
          className="flex min-h-15 items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
        >
          {estrellas ? (
            <>
              <Estrellas valor={estrellas.promedio} />
              <span className="flex-1 font-bold">
                {promedioTexto(estrellas.promedio)} · {estrellas.cantidad === 1 ? "1 calificación" : `${estrellas.cantidad} calificaciones`}
              </span>
            </>
          ) : (
            <span className="flex-1 font-bold">Todavía sin calificaciones</span>
          )}
          <span className="text-[15px] text-muted-foreground">Ver</span>
          <ChevronRightIcon aria-hidden className="size-5" />
        </Link>
      )}

      <p className="text-[15px] text-muted-foreground">
        Muéstralo si te lo piden. Para corregir un dato, pídeselo al administrador de la línea.
      </p>
    </div>
  )
}
