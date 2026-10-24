"use client"

import { CheckIcon } from "lucide-react"
import { createContext, useContext, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { SENTIDOS, type Sentido } from "@/lib/viajes"

// El sentido va en la dirección (?hacia=centro): así sobrevive al refresco en vivo y a volver atrás
export const HACIA: Record<Sentido, string> = { vg_a_centro: "centro", centro_a_vg: "valle" }

const Contexto = createContext<{ sentido: Sentido; cambiar: (s: Sentido) => void } | null>(null)

/** El sentido escogido en Inicio; quien no está dentro (otras pantallas) usa el que le pasen */
export function useSentido(porDefecto?: Sentido): Sentido {
  const c = useContext(Contexto)
  return c?.sentido ?? porDefecto ?? "vg_a_centro"
}

/**
 * Los dos sentidos de Inicio vienen cargados juntos (§8): cambiar es instantáneo, sin pedir la página otra vez. La
 * dirección se actualiza sin recargar, para el refresco en vivo y para volver atrás.
 */
export function SentidoInicio({ inicial, children }: { inicial: Sentido; children: React.ReactNode }) {
  const [sentido, setSentido] = useState(inicial)
  const cambiar = (s: Sentido) => {
    setSentido(s)
    window.history.replaceState(null, "", `/inicio?hacia=${HACIA[s]}`)
  }
  return <Contexto.Provider value={{ sentido, cambiar }}>{children}</Contexto.Provider>
}

/** Los dos botones "Al Centro / A Valle Grande", cada uno con cuántas unidades van */
export function SelectorSentido({ unidades }: { unidades: Record<Sentido, number> }) {
  const c = useContext(Contexto)
  if (!c) return null
  return (
    <div role="group" aria-label="Sentido" className="grid grid-cols-2 gap-2">
      {(Object.keys(SENTIDOS) as Sentido[]).map((s) => {
        const activo = s === c.sentido
        const n = unidades[s]
        const texto = n === 0 ? "Sin unidades" : n === 1 ? "1 unidad" : `${n} unidades`
        return (
          <button
            key={s}
            type="button"
            onClick={() => c.cambiar(s)}
            aria-pressed={activo}
            className={cn(
              "flex min-h-20 flex-col items-start justify-between gap-1 rounded-2xl border-2 p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
              activo
                ? "border-signal bg-card text-card-foreground shadow-md"
                : "border-header-foreground/30 bg-header-foreground/10 text-header-foreground hover:bg-header-foreground/20"
            )}
          >
            <span className="flex items-center gap-1.5 text-base leading-tight font-bold">
              {activo && <CheckIcon aria-hidden className="size-5 shrink-0 text-primary" />}
              {SENTIDOS[s].corto}
            </span>
            {activo ? <Badge variant={n > 0 ? "success" : "secondary"}>{texto}</Badge> : <span className="text-sm opacity-90">{texto}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Lo de un sentido: solo se ve cuando es el escogido (el otro sigue montado, listo para mostrarse) */
export function PanelSentido({ sentido, children }: { sentido: Sentido; children: React.ReactNode }) {
  const activo = useSentido() === sentido
  return (
    <div className={activo ? "contents" : "hidden"}>
      {children}
    </div>
  )
}
