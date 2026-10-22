import { ChevronRightIcon } from "lucide-react"
import Link from "next/link"

import { Avatar } from "@/components/foto/avatar"
import type { PasajeroQueUsa, Uso, UsoPorChofer } from "@/lib/datos/admin"
import { hace } from "@/lib/fechas"
import { cn } from "@/lib/utils"

// Cómo entró cada pasajero al carro (§8, Resumen punto 5). Colores validados para daltonismo; con contraste bajo en
// claro, por eso cada parte lleva siempre su número escrito en la leyenda.
const ENTRADAS = [
  { clave: "app", texto: "Por la app", color: "bg-uso-app" },
  { clave: "enCamino", texto: "Por la app, en el camino", color: "bg-uso-camino" },
  { clave: "aMano", texto: "Anotados a mano", color: "bg-uso-mano" },
] as const
type Conteo = { app: number; enCamino: number; aMano: number }

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)

/** Barra apilada: cada parte con 2 px de separación y su número al pasar el dedo o el mouse */
function Barra({ conteo, alto = "h-4" }: { conteo: Conteo; alto?: string }) {
  const total = conteo.app + conteo.enCamino + conteo.aMano
  if (total === 0) return <div className={cn("w-full rounded-full bg-muted", alto)} />
  return (
    <div role="img" aria-label={ENTRADAS.map((e) => `${e.texto}: ${conteo[e.clave]}`).join(", ")} className={cn("flex w-full gap-0.5", alto)}>
      {ENTRADAS.filter((e) => conteo[e.clave] > 0).map((e) => (
        <div
          key={e.clave}
          title={`${e.texto}: ${conteo[e.clave]} (${pct(conteo[e.clave], total)}%)`}
          className={cn("h-full rounded-sm first:rounded-l-full last:rounded-r-full", e.color)}
          style={{ width: `${(conteo[e.clave] / total) * 100}%` }}
        />
      ))}
    </div>
  )
}

function Leyenda({ conteo }: { conteo: Conteo }) {
  const total = conteo.app + conteo.enCamino + conteo.aMano
  return (
    <ul className="flex flex-col gap-1.5">
      {ENTRADAS.map((e) => (
        <li key={e.clave} className="flex items-center gap-2 text-sm">
          <span aria-hidden className={cn("size-3 shrink-0 rounded-sm", e.color)} />
          <span className="flex-1">{e.texto}</span>
          <span className="font-bold tabular-nums">{conteo[e.clave]}</span>
          <span className="w-11 text-right text-muted-foreground tabular-nums">{pct(conteo[e.clave], total)}%</span>
        </li>
      ))}
    </ul>
  )
}

/** Los números del período: cómo entraron al carro y cuántas personas viajan con su cuenta */
export function UsoNumeros({ uso, enlace }: { uso: Uso; enlace?: string }) {
  const { total } = uso
  return (
    <div className="flex flex-col gap-4">
      {total.llevados === 0 ? (
        <p className="text-muted-foreground">Todavía no hay viajes terminados con pasajeros en este período.</p>
      ) : (
        <>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-xl leading-none font-bold tabular-nums">{total.porcentajeApp}%</span>
            <span className="text-muted-foreground">
              de {total.llevados} {total.llevados === 1 ? "pasajero llevado" : "pasajeros llevados"} usó la app
            </span>
          </p>
          <Barra conteo={total} />
          <Leyenda conteo={total} />
        </>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Tile valor={uso.pasajeros.length} texto={uso.pasajeros.length === 1 ? "persona viajó con su cuenta" : "personas viajaron con su cuenta"} />
        <Tile valor={uso.repiten} texto={uso.repiten === 1 ? "repite (2+ viajes)" : "repiten (2+ viajes)"} />
        <Tile valor={uso.nuevos} texto={uso.nuevos === 1 ? "viajó por primera vez" : "viajaron por primera vez"} />
      </div>

      {enlace && (
        <Link
          href={enlace}
          className="inline-flex min-h-11 w-fit items-center gap-1 rounded-md font-bold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          Ver detalle: por chofer y quiénes viajan
          <ChevronRightIcon aria-hidden className="size-5" />
        </Link>
      )}
    </div>
  )
}

function Tile({ valor, texto }: { valor: number; texto: string }) {
  return (
    <div className="flex min-h-24 flex-col justify-between gap-2 rounded-2xl bg-muted p-3">
      <span className="text-xl leading-none font-bold tabular-nums">{valor}</span>
      <span className="text-sm leading-tight text-muted-foreground">{texto}</span>
    </div>
  )
}

/** Por chofer: quién todavía anota mucho a mano */
export function UsoPorChoferLista({ choferes }: { choferes: UsoPorChofer[] }) {
  if (choferes.length === 0) return null
  return (
    <ul className="flex flex-col gap-3">
      {choferes.map((c) => {
        const conteo = { app: c.app, enCamino: c.en_camino, aMano: c.a_mano }
        const total = c.app + c.en_camino + c.a_mano
        return (
          <li key={c.chofer_id} className="flex flex-col gap-2 rounded-2xl bg-muted p-3">
            <p className="flex flex-col">
              <span className="font-bold">{c.nombre}</span>
              <span className="text-sm text-muted-foreground">
                {total} {total === 1 ? "pasajero" : "pasajeros"} · {pct(c.app + c.en_camino, total)}% por la app
              </span>
            </p>
            <Barra conteo={conteo} alto="h-3" />
            <p className="text-sm text-muted-foreground">
              App {c.app} · En el camino {c.en_camino} · A mano {c.a_mano}
            </p>
          </li>
        )
      })}
    </ul>
  )
}

/** Pasajeros identificados que viajaron en el período, primero quien más viaja */
export function PasajerosQueUsan({ pasajeros }: { pasajeros: PasajeroQueUsa[] }) {
  if (pasajeros.length === 0) return <p className="text-muted-foreground">Nadie viajó con su cuenta en este período.</p>
  return (
    <ol className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {pasajeros.map((p) => (
        <li key={p.pasajero_id} className="flex items-center gap-3 rounded-2xl border-2 bg-card px-3 py-2.5">
          <Avatar url={p.fotoUrl} nombre={p.nombre} className="size-11" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2">
              <span className="truncate font-bold">{p.nombre}</span>
              {p.nuevo && <span className="rounded-full bg-success-muted px-2 py-0.5 text-sm font-bold text-success">Nuevo</span>}
            </p>
            <p className="text-sm text-muted-foreground">Último viaje {hace(p.ultimo_viaje)}</p>
          </div>
          <span className="text-right">
            <span className="block text-base leading-none font-bold tabular-nums">{p.viajes}</span>
            <span className="text-sm text-muted-foreground">{p.viajes === 1 ? "viaje" : "viajes"}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
