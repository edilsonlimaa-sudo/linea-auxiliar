import { BadgeCheck, Phone } from "lucide-react"
import type { Metadata } from "next"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { CambiarFoto } from "@/components/nueva/pasajero/cambiar-foto"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { Badge } from "@/components/nueva/ui/badge"
import { cargarCarnet, cargarViajesPasajero } from "@/lib/datos/historial"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { formatearTelefono } from "@/lib/telefono"
import { iniciales } from "@/lib/viajes"

export const metadata: Metadata = { title: "Mi carnet · Línea Auxiliar" }

const mesAno = (iso: string) =>
  new Intl.DateTimeFormat("es-VE", { month: "long", year: "numeric", timeZone: "America/Caracas" }).format(new Date(iso)).replace(/^./, (c) => c.toUpperCase())
const diaMes = (iso: string) =>
  new Intl.DateTimeFormat("es-VE", { day: "numeric", month: "short", timeZone: "America/Caracas" }).format(new Date(iso)).replace(/\./g, "")

// Mi carnet (R53): la identidad que ve el chofer, con sus números; la foto se pone o cambia aquí (R54)
export default async function Carnet() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const [carnet, viajes] = await Promise.all([cargarCarnet(perfil), cargarViajesPasajero(perfil.id)])
  const calificados = viajes.filter((v) => v.estrellas !== null).length

  return (
    <Screen>
      <AppHeader title="Mi carnet" backHref="/n/menu" />
      <div className="flex flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <section className="relative overflow-hidden rounded-3xl border bg-card p-5 text-card-foreground">
          <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-primary/10" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Línea Auxiliar</p>
              <p className="font-heading text-sm font-semibold text-primary">Carnet de pasajero</p>
            </div>
            <Badge variant="secondary">
              <BadgeCheck className="size-3.5" />
              Verificado
            </Badge>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <ChoferAvatar chofer={{ nombre: perfil.nombre, iniciales: iniciales(perfil.nombre), fotoUrl: carnet.fotoUrl }} className="size-20 text-2xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-2xl font-semibold">{perfil.nombre}</p>
              {perfil.urbanismo ? <p className="truncate text-sm text-muted-foreground">{perfil.urbanismo}</p> : null}
              {carnet.telefono ? (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="size-3.5" /> {formatearTelefono(carnet.telefono)}
                </p>
              ) : null}
            </div>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">Desde {mesAno(perfil.creado_en)}</p>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <Stat valor={viajes.length} etiqueta="viajes" />
          <Stat valor={calificados} etiqueta="calificados" />
          <Stat valor={viajes[0] ? diaMes(viajes[0].cuando) : "—"} etiqueta="último viaje" />
        </section>

        <CambiarFoto tieneFoto={Boolean(carnet.fotoUrl)} />
      </div>
    </Screen>
  )
}

function Stat({ valor, etiqueta }: { valor: React.ReactNode; etiqueta: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border bg-card p-3 text-center">
      <span className="font-heading text-lg font-semibold tabular-nums">{valor}</span>
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
    </div>
  )
}
