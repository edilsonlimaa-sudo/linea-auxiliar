import { Clock, MessageCircle, Phone, Snowflake, Star, Users } from "lucide-react"
import type { Metadata } from "next"

import { EnVivo } from "@/components/en-vivo"
import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { promedio } from "@/components/nueva/pasajero/estrellas"
import { Badge } from "@/components/nueva/ui/badge"
import { Button } from "@/components/nueva/ui/button"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { cargarInicioChofer } from "@/lib/datos/inicio-chofer"
import { ahoraDelPedido } from "@/lib/nueva/vistas"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { iniciales, libres, llegada, SENTIDOS, type Viaje } from "@/lib/viajes"

export const metadata: Metadata = { title: "Compañeros · Línea Auxiliar" }

// Lo que está pasando primero: en ruta, recogiendo, llegando, en camino; los próximos al final
const PRIORIDAD: Record<string, number> = { en_ruta: 0, en_parada: 1, llegando: 2, en_camino: 3, programado: 4 }

/**
 * Compañeros en la ruta (R7, §8): quién trabaja, qué hace ahora y cuántos lleva, sus próximos viajes (para no ir todos
 * al mismo lado), WhatsApp, Llamar y dónde está en el mapa. Reglas de components/chofer/companeros.tsx.
 */
export default async function Companeros() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const { companeros, viajesCompaneros } = await cargarInicioChofer(perfil.id, perfil.conectado_en !== null)
  const ahora = ahoraDelPedido()
  const saludo = (nombre: string) => encodeURIComponent(`Hola ${nombre.split(" ")[0]}, soy ${perfil.nombre.split(" ")[0]}, de la Línea Auxiliar.`)

  return (
    <Screen>
      <EnVivo />
      <AppHeader title="Compañeros" backHref="/n/chofer" />
      <div className="flex flex-col gap-4 p-4">
        {companeros.length === 0 ? (
          <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nadie más está trabajando ahora.</p>
        ) : null}
        {companeros.map((c) => {
          const suyos = viajesCompaneros.filter((v) => v.chofer_id === c.id).sort((a, b) => PRIORIDAD[a.estado] - PRIORIDAD[b.estado])
          const porId = new Map<string, Viaje>(suyos.map((v) => [v.id, v]))
          const actual = suyos.find((v) => v.estado !== "programado") ?? null
          const proximos = suyos.filter((v) => v.estado === "programado")
          const digitos = c.telefono?.replace(/\D/g, "")
          return (
            <section key={c.id} className="flex flex-col gap-3 rounded-3xl border bg-card p-4">
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
                {actual ? (
                  <>
                    <p className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{SENTIDOS[actual.sentido].corto}</Badge>
                      <span className="font-medium">
                        {actual.estado === "en_ruta" ? `En ruta ${SENTIDOS[actual.sentido].hacia}` : llegada(actual, porId, ahora).principal}
                      </span>
                    </p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Users className="size-3.5" />
                      Lleva {Math.min(actual.ocupados, actual.puestos)} de {actual.puestos}
                      {libres(actual) > 0 ? ` · ${libres(actual) === 1 ? "1 libre" : `${libres(actual)} libres`}` : " · lleno"}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Conectado, sin viaje publicado.</p>
                )}
              </div>

              {proximos.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm">
                  {proximos.map((v) => (
                    <li key={v.id} className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="size-3.5 shrink-0" />
                      Después: {SENTIDOS[v.sentido].corto} · {llegada(v, porId, ahora).principal.toLowerCase()}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                {digitos ? (
                  <>
                    <Button variant="outline" render={<a href={`https://wa.me/${digitos}?text=${saludo(c.nombre)}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
                      <MessageCircle /> WhatsApp
                    </Button>
                    <Button variant="outline" render={<a href={`tel:+${digitos}`} />} nativeButton={false}>
                      <Phone /> Llamar
                    </Button>
                  </>
                ) : null}
              </div>
              <VerEnMapa choferId={c.id} chofer={c.nombre} yo={null} admin className="w-full rounded-4xl" />
            </section>
          )
        })}
      </div>
    </Screen>
  )
}
