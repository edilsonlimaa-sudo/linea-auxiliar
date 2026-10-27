import { Clock, MessageCircle, Phone, Snowflake, Star, Users } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { promedio } from "@/components/nueva/pasajero/estrellas"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { cargarInicioChofer } from "@/lib/datos/inicio-chofer"
import { situacionDe } from "@/lib/nueva/companeros"
import { ahoraDelPedido } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { iniciales, SENTIDOS } from "@/lib/viajes"

export const metadata: Metadata = { title: "Compañero · Línea Auxiliar" }

/**
 * Un compañero que trabaja (R7, §8): qué hace ahora y cuántos lleva, sus próximos viajes (para no ir todos al mismo
 * lado), WhatsApp, Llamar y dónde está en el mapa. Reglas de components/chofer/companeros.tsx.
 */
export default async function Companero({ params }: PageProps<"/n/chofer/companeros/[id]">) {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const [{ id }, datos] = await Promise.all([params, cargarInicioChofer(perfil.id, perfil.conectado_en !== null)])
  const c = datos.companeros.find((x) => x.id === id)

  if (!c) {
    return (
      <Screen>
        <EnVivo />
        <AppHeader title="Compañero" backHref="/n/chofer/companeros" />
        <div className="flex flex-col gap-4 p-4">
          <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Ya no está trabajando.</p>
          <Button variant="outline" render={<Link href="/n/chofer/companeros" transitionTypes={["nav-back"]} />} nativeButton={false}>
            Ver quién trabaja
          </Button>
        </div>
      </Screen>
    )
  }

  const s = situacionDe(c.id, datos.viajesCompaneros, ahoraDelPedido())
  const digitos = c.telefono?.replace(/\D/g, "")
  const saludo = encodeURIComponent(`Hola ${c.nombre.split(" ")[0]}, soy ${perfil.nombre.split(" ")[0]}, de la Línea Auxiliar.`)

  return (
    <Screen>
      <EnVivo />
      <AppHeader title={c.nombre.split(" ")[0]} backHref="/n/chofer/companeros" />
      <div className="flex flex-col gap-4 p-4">
        <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <ChoferAvatar chofer={{ nombre: c.nombre, iniciales: iniciales(c.nombre), fotoUrl: c.fotoUrl }} className="size-12" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-heading font-semibold">
                <span className="truncate">{c.nombre}</span>
                {c.estrellas !== null ? (
                  <span className="flex shrink-0 items-center gap-0.5 text-xs font-normal text-muted-foreground">
                    <Star className="size-3 fill-amber-400 text-amber-400" /> {promedio(c.estrellas)}
                  </span>
                ) : null}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                {c.placa ? <span className="font-mono tracking-wider">{c.placa}</span> : null}
                {c.unidad ? <span>Unidad {c.unidad}</span> : null}
                {c.aire ? (
                  <span className="flex items-center gap-1">
                    <Snowflake className="size-3.5" /> Con aire
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-2xl bg-muted/60 p-3 text-sm">
            {s.sentido ? (
              <p className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{SENTIDOS[s.sentido].corto}</Badge>
                <span className="font-medium">{s.ahora}</span>
              </p>
            ) : (
              <p className="text-muted-foreground">{s.ahora}</p>
            )}
            {s.lleva ? (
              <p className="flex items-center gap-1 text-muted-foreground">
                <Users className="size-3.5" />
                {s.lleva}
              </p>
            ) : null}
          </div>

          {s.despues.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm">
              {s.despues.map((d) => (
                <li key={d} className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-3.5 shrink-0" />
                  Después: {d}
                </li>
              ))}
            </ul>
          ) : null}

          {digitos ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" render={<a href={`https://wa.me/${digitos}?text=${saludo}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
                <MessageCircle /> WhatsApp
              </Button>
              <Button variant="outline" render={<a href={`tel:+${digitos}`} />} nativeButton={false}>
                <Phone /> Llamar
              </Button>
            </div>
          ) : null}
          <VerEnMapa choferId={c.id} chofer={c.nombre} yo={null} admin className="w-full rounded-4xl" />
        </section>
      </div>
    </Screen>
  )
}
