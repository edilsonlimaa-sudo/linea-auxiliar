import { Clock, MapPin, Users } from "lucide-react"
import type { Metadata } from "next"

import { Marca } from "@/components/nueva/acceso/marca"
import { Screen } from "@/components/nueva/app/screen"
import { FormularioInteres } from "@/components/nueva/interes/formulario-interes"
import { RUTAS_NUEVAS } from "@/lib/rutas-nuevas"

const r = RUTAS_NUEVAS.faro

export const metadata: Metadata = {
  title: `${r.lugar} ⇄ ${r.destino} · Línea Auxiliar`,
  description: `La Línea Auxiliar quiere abrir la ruta ${r.lugar} ⇄ ${r.destino}. Anótate si la usarías como pasajero o como chofer.`,
}

// R96 (§5.24): página pública para medir el interés en la ruta El Faro ⇄ Centro antes de abrirla. Sin cuenta
export default function PaginaFaro() {
  return (
    <Screen>
      <div className="flex flex-1 flex-col gap-6 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Marca subtitulo="Transporte comunitario · Maturín" />

        <header className="flex flex-col gap-3">
          <span className="w-fit rounded-full bg-amber-400 px-3 py-1 text-xs font-bold tracking-wider text-amber-950 uppercase">Ruta nueva</span>
          <h1 className="font-heading text-3xl leading-tight font-semibold text-balance">
            {r.lugar} <span className="text-primary">⇄</span> {r.destino}
          </h1>
          <p className="text-muted-foreground">
            La Línea Auxiliar ya lleva a cientos de vecinos entre Valle Grande y el Centro de Maturín, con carros de la comunidad.
            Ahora queremos abrir la ruta de <b className="text-foreground">{r.lugar}</b>. ¿La usarías?
          </p>
        </header>

        <ul className="grid gap-2 text-sm">
          <li className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <MapPin className="size-5 shrink-0 text-primary" /> Ves en la app qué carro viene y apartas tu puesto
          </li>
          <li className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <Users className="size-5 shrink-0 text-primary" /> Choferes de la comunidad, con nombre, carro y calificación
          </li>
          <li className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <Clock className="size-5 shrink-0 text-primary" /> Para volver, una lista justa: sale quien llegó primero
          </li>
        </ul>

        <p className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
          <b>La ruta todavía no existe.</b> Si se anotan suficientes vecinos (y choferes), la abrimos y te avisamos por WhatsApp.
        </p>

        <FormularioInteres ruta="faro" />
      </div>
    </Screen>
  )
}
