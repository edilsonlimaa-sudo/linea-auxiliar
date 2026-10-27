import { BadgeCheck, Phone, Star } from "lucide-react"
import type { Metadata } from "next"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { AireInterruptor, PagoMovilEditar } from "@/components/nueva/chofer/carnet"
import { CambiarFoto } from "@/components/nueva/pasajero/cambiar-foto"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { promedio } from "@/components/nueva/pasajero/estrellas"
import { Badge } from "@/components/nueva/ui/badge"
import { cargarCarnet } from "@/lib/datos/historial"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { formatearTelefono } from "@/lib/telefono"
import { iniciales } from "@/lib/viajes"

export const metadata: Metadata = { title: "Mi carnet · Línea Auxiliar" }

// Mi carnet del chofer (R53): lo que ven los pasajeros de él y de su carro; aquí pone las fotos (R54), el aire (R55) y
// su Pago Móvil (R74)
export default async function CarnetChofer() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const c = await cargarCarnet(perfil)
  const carro = c.vehiculo

  return (
    <Screen>
      <AppHeader title="Mi carnet" backHref="/n/chofer/menu" />
      <div className="flex flex-col gap-4 p-4">
        <section className="relative overflow-hidden rounded-3xl border bg-card p-5">
          <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-primary/10" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Línea Auxiliar</p>
              <p className="font-heading text-sm font-semibold text-primary">Carnet de chofer</p>
            </div>
            <Badge variant="secondary">
              <BadgeCheck className="size-3.5" /> Verificado
            </Badge>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <ChoferAvatar chofer={{ nombre: perfil.nombre, iniciales: iniciales(perfil.nombre), fotoUrl: c.fotoUrl }} className="size-20 text-2xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-2xl font-semibold">{perfil.nombre}</p>
              {c.telefono ? (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="size-3.5" /> {formatearTelefono(c.telefono)}
                </p>
              ) : null}
              {c.estrellas ? (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {promedio(c.estrellas.promedio)} · {c.estrellas.cantidad === 1 ? "1 calificación" : `${c.estrellas.cantidad} calificaciones`}
                </p>
              ) : null}
            </div>
          </div>
          {carro ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
              {c.fotoCarroUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- la foto viene de /foto (privada, con caché propia)
                <img src={c.fotoCarroUrl} alt="Tu carro" className="size-16 shrink-0 rounded-xl object-cover" />
              ) : null}
              <div className="min-w-0">
                <p className="font-medium">{[carro.modelo, carro.color].filter(Boolean).join(" ") || "Tu carro"}</p>
                <p className="font-mono text-sm tracking-wider text-muted-foreground">
                  {carro.placa}
                  {carro.unidad ? ` · Unidad ${carro.unidad}` : ""}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        <div className="grid grid-cols-2 gap-2">
          <CambiarFoto tieneFoto={Boolean(c.fotoUrl)} />
          {carro ? <CambiarFoto tipo="carro" tieneFoto={Boolean(c.fotoCarroUrl)} /> : null}
        </div>
        {carro ? <AireInterruptor tiene={Boolean(carro.aire_acondicionado)} /> : null}
        <PagoMovilEditar actual={c.pagoMovil} telefono={c.telefono} cedula={c.cedula} />
      </div>
    </Screen>
  )
}
