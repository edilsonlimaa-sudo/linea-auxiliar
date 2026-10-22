import { BadgeCheckIcon, ChevronRightIcon } from "lucide-react"
import Link from "next/link"

import { Estrellas, promedioTexto } from "@/components/estrellas"
import { Avatar } from "@/components/foto/avatar"
import { InterruptorAire } from "@/components/foto/interruptor-aire"
import { SubirFoto } from "@/components/foto/subir-foto"
import { ChipAire } from "@/components/pasajero/chofer-resumen"
import type { Carnet } from "@/lib/datos/historial"
import { fechaLarga } from "@/lib/fechas"
import { formatearTelefono } from "@/lib/telefono"

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{etiqueta}</dt>
      <dd className="text-base">{children}</dd>
    </div>
  )
}

/**
 * Mi carnet (R53): la credencial de la línea, para mostrar si se la piden. Se parece a un carnet de verdad
 * (franja de la línea, nombre grande, verificado) y para el chofer destaca la placa.
 */
export function CarnetVista({ carnet }: { carnet: Carnet }) {
  const { perfil, telefono, cedula, vehiculo, estrellas, fotoUrl, fotoCarroUrl } = carnet
  const esChofer = perfil.rol === "chofer"

  return (
    <div className="flex flex-col gap-4">
      <article aria-label="Carnet de la Línea Auxiliar" className="overflow-hidden rounded-2xl border-2 border-primary bg-card shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b-4 border-signal bg-header px-4 py-3 text-header-foreground">
          <span className="leading-tight">
            <span className="block font-bold">Línea Auxiliar</span>
            <span className="block text-sm opacity-90">Valle Grande</span>
          </span>
          <span className="rounded-full bg-header-foreground/15 px-3 py-1 text-sm font-bold">{esChofer ? "Chofer" : "Pasajero"}</span>
        </header>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-4">
            <Avatar url={fotoUrl} nombre={perfil.nombre} className="size-24 text-xl" />
            <div className="min-w-0">
              <h1 className="text-lg leading-tight font-bold">{perfil.nombre}</h1>
              <p className="mt-1 flex items-center gap-1.5 font-bold text-success">
                <BadgeCheckIcon aria-hidden className="size-5" />
                Verificado
              </p>
              {perfil.aprobado_en && <p className="text-sm text-muted-foreground">desde el {fechaLarga(perfil.aprobado_en)}</p>}
            </div>
          </div>

          {esChofer && vehiculo && (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-muted px-4 py-4 text-center">
              {fotoCarroUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- enlace firmado de Supabase Storage (R54)
                <img src={fotoCarroUrl} alt="Foto de tu carro" className="aspect-video w-full rounded-xl object-cover" />
              )}
              <span className="rounded-lg border-[3px] border-foreground bg-card px-4 py-1 font-mono text-xl font-bold tracking-[0.2em]">
                {vehiculo.placa}
              </span>
              <span className="text-base">
                {[vehiculo.modelo, vehiculo.color].filter(Boolean).join(" · ")}
                {vehiculo.unidad && <strong> · Unidad {vehiculo.unidad}</strong>}
              </span>
              {vehiculo.aire_acondicionado && <ChipAire />}
            </div>
          )}

          <dl className="grid gap-4 sm:grid-cols-2">
            {telefono && <Dato etiqueta="Teléfono">{formatearTelefono(telefono)}</Dato>}
            {cedula && <Dato etiqueta="Cédula">{cedula}</Dato>}
            {!esChofer && perfil.urbanismo && <Dato etiqueta="Vive en">{perfil.urbanismo}</Dato>}
          </dl>
        </div>
      </article>

      {/* Lo que cada uno puede cambiar solo (R53–R55) */}
      <section aria-labelledby="titulo-editar" className="flex flex-col gap-3">
        <h2 id="titulo-editar" className="text-base font-bold">
          {esChofer ? "Tus fotos y tu carro" : "Tu foto"}
        </h2>
        {!fotoUrl && (
          <p className="-mt-1 text-sm text-muted-foreground">
            {esChofer ? "Con tu foto, los pasajeros te reconocen al llegar." : "Con tu foto, el chofer te reconoce al recogerte."}
          </p>
        )}
        <SubirFoto tipo="perfil" tieneFoto={Boolean(fotoUrl)} />
        {esChofer && (
          <>
            <SubirFoto tipo="carro" tieneFoto={Boolean(fotoCarroUrl)} />
            <InterruptorAire tiene={Boolean(vehiculo?.aire_acondicionado)} />
          </>
        )}
      </section>

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
          <span className="text-sm text-muted-foreground">Ver</span>
          <ChevronRightIcon aria-hidden className="size-5" />
        </Link>
      )}

      <p className="text-sm text-muted-foreground">
        Muéstralo si te lo piden. Para corregir otro dato, pídeselo al administrador de la línea.
      </p>
    </div>
  )
}
