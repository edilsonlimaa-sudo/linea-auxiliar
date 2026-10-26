import { ChevronRight, Users } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { AnotarmeCta, CarrosQueVienen } from "@/components/nueva/pasajero/lista"
import { cargarInicioPasajero } from "@/lib/datos/inicio-pasajero"
import { cargarListaGina } from "@/lib/datos/lista-gina"
import { ahoraDelPedido, unidadVista } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { carrosHaciaValle } from "@/lib/viajes"

export const metadata: Metadata = { title: "A Valle Grande · Línea Auxiliar" }

// A Valle Grande (§5.17): no se aparta, se anota en la lista en Gina. Cuántos esperan, los carros que vienen y Anotarme
export default async function AValleGrande() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva" })
  const [datos, lista] = await Promise.all([cargarInicioPasajero(perfil.id), cargarListaGina()])
  // Con un viaje en curso o ya anotado, su lugar es Mi viaje
  if (datos.miReserva || lista.some((e) => e.esMio)) redirect("/n")
  const ahora = ahoraDelPedido()
  const carros = carrosHaciaValle(datos.viajes, datos.porId).map((v) => unidadVista(v, datos.porId, ahora))
  const esperan = lista.reduce((n, e) => n + e.personas, 0)

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="A Valle Grande" backHref="/n" />
      <div className="flex flex-1 flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div>
          <p className="text-sm text-muted-foreground">Centro → Valle Grande</p>
          <h2 className="font-heading text-2xl font-semibold">La lista en Gina</h2>
        </div>
        <Link
          href="/n/fila"
          transitionTypes={["nav-forward"]}
          className="flex items-center gap-3 rounded-3xl border bg-card p-4 transition-colors active:bg-muted"
        >
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-semibold">
              {esperan === 0 ? "Nadie esperando" : `${esperan === 1 ? "1 persona" : `${esperan} personas`} esperando`}
            </p>
            <p className="text-sm text-muted-foreground">El orden es por la hora en que cada uno se anota.</p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <section className="flex flex-col gap-3">
          <h3 className="font-heading text-lg font-semibold">Carros que vienen</h3>
          <CarrosQueVienen carros={carros} />
        </section>
        <div className="mt-auto flex flex-col pt-2">
          <AnotarmeCta />
        </div>
      </div>
    </Screen>
  )
}
