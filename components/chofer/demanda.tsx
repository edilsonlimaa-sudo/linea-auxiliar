import { UsersIcon } from "lucide-react"

import type { DatosInicioChofer } from "@/lib/datos/inicio-chofer"
import { cn } from "@/lib/utils"
import { haciaEnFrase, SENTIDOS, type Sentido } from "@/lib/viajes"

type Props = { esperando: Record<Sentido, number>; oferta: DatosInicioChofer["oferta"] }

/** Falta transporte: esperan más personas que los puestos libres que ya ofrecen los demás */
export const faltaTransporte = (esperando: number, puestosLibres: number) => esperando > 0 && esperando > puestosLibres

/**
 * "¿Hay gente esperando?" (docs/especificacion.md §8 Inicio del chofer, R31): por sentido, cuántos esperan y cuánta
 * oferta ya hay de otros choferes. Es lo que el chofer mira antes de salir. Solo cantidades, nunca quién ni dónde.
 */
// children: "Ver quién espera" (R31), debajo de los números
export function Demanda({ esperando, oferta, children }: Props & { children?: React.ReactNode }) {
  return (
    <section aria-labelledby="titulo-demanda" className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4">
      <h2 id="titulo-demanda" className="flex items-center gap-2 text-lg font-bold">
        <UsersIcon aria-hidden className="size-5 text-primary" />
        ¿Hay gente esperando?
      </h2>
      <ul className="flex flex-col gap-2">
        {(Object.keys(SENTIDOS) as Sentido[]).map((s) => {
          const n = esperando[s]
          const { unidades, puestosLibres } = oferta[s]
          const falta = faltaTransporte(n, puestosLibres)
          return (
            <li key={s} className={cn("flex items-center gap-4 rounded-2xl px-4 py-3", falta ? "border-2 border-signal bg-signal/15" : "bg-muted")}>
              <span className={cn("w-12 shrink-0 text-center text-4xl leading-none font-bold tabular-nums", n === 0 && "text-muted-foreground")}>{n}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">
                  {n === 1 ? "espera" : "esperan"} para ir {haciaEnFrase(s)}
                </span>
                <span className="block text-[15px] text-muted-foreground">
                  {unidades === 0
                    ? "Ningún compañero va todavía"
                    : `Ya ${unidades === 1 ? "va 1 unidad" : `van ${unidades} unidades`} · ${puestosLibres === 1 ? "1 puesto libre" : `${puestosLibres} puestos libres`}`}
                </span>
              </span>
              {falta && <span className="shrink-0 rounded-full bg-signal px-2.5 py-1 text-sm font-bold text-signal-foreground">Falta transporte</span>}
            </li>
          )
        })}
      </ul>
      {children}
    </section>
  )
}

/** Con un viaje abierto: la demanda en una línea, para no perderla de vista */
export function DemandaCompacta({ esperando, oferta }: Props) {
  const partes = (Object.keys(SENTIDOS) as Sentido[]).map((s) => {
    const n = esperando[s]
    return { s, texto: n === 0 ? `nadie ${haciaEnFrase(s)}` : `${n} ${haciaEnFrase(s)}`, falta: faltaTransporte(n, oferta[s].puestosLibres) }
  })
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-muted px-4 py-2.5 text-[15px]">
      <UsersIcon aria-hidden className="size-4 shrink-0 text-primary" />
      <span className="font-bold">Esperando:</span>
      {partes.map((p, i) => (
        <span key={p.s} className={cn(p.falta && "font-bold")}>
          {i > 0 && <span aria-hidden className="mr-2 text-muted-foreground">·</span>}
          {p.texto}
          {p.falta && <span className="ml-1 rounded-full bg-signal px-1.5 text-sm font-bold text-signal-foreground">falta</span>}
        </span>
      ))}
    </p>
  )
}

/** Sentido a sugerir al publicar: el de más demanda sin atender; sin demanda, null (se usa el contrario al último) */
export function sentidoConMasDemanda({ esperando, oferta }: Props): Sentido | null {
  const sinAtender = (s: Sentido) => esperando[s] - oferta[s].puestosLibres
  const [a, b] = Object.keys(SENTIDOS) as Sentido[]
  const mejor = sinAtender(a) >= sinAtender(b) ? a : b
  return esperando[mejor] > 0 ? mejor : null
}
