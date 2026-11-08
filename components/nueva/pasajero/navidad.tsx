import { Sparkles } from "lucide-react"

import { NAVIDAD, type Temporada } from "@/lib/temporada"
import { cn } from "@/lib/utils"

// Temporada navideña (§5.25). Los colores de fiesta son tokens de globals.css (--navidad-*)

// Dónde cuelga cada esfera, de arriba hacia abajo (viewBox 100 × 130)
const ESFERAS: [number, number][] = [
  [50, 42],
  [44, 54], [56, 54],
  [42, 66], [58, 66], [50, 72],
  [32, 80], [46, 80], [60, 78], [70, 82],
  [22, 92], [36, 91], [52, 92], [66, 90], [78, 92],
  [28, 108], [42, 106], [56, 108], [70, 106],
  [18, 119], [32, 118], [48, 120], [64, 118], [80, 119],
]
const COLOR_ESFERA = ["var(--navidad-rojo)", "var(--navidad-oro)", "var(--primary)", "var(--navidad-nieve)"]

/** El arbolito (R100): las primeras `esferas` encendidas; `nueva` resalta la última (R101) */
export function Arbolito({ esferas, nueva = false, className }: { esferas: number; nueva?: boolean; className?: string }) {
  const ultima = nueva && esferas > 0 ? ESFERAS[esferas - 1] : null
  return (
    <svg viewBox="0 0 100 130" aria-hidden className={cn("shrink-0", className)}>
      <path d="M50 22 L74 60 L62 60 L84 96 L68 96 L92 124 L8 124 L32 96 L16 96 L38 60 L26 60 Z" style={{ fill: "var(--navidad-verde)" }} />
      <path d="M50 22 L74 60 L62 60 L84 96 L68 96 L92 124 L50 124 Z" fill="#000" opacity=".14" />
      <rect x="43" y="124" width="14" height="6" rx="1" fill="#7a4a24" />
      <path d="M50 6 l4 9 10 1-7.5 6.5 2.3 9.8L50 27l-8.8 5.3 2.3-9.8L36 16l10-1Z" style={{ fill: "var(--navidad-oro)" }} />
      {ultima ? <circle cx={ultima[0]} cy={ultima[1]} r="13" style={{ fill: "var(--navidad-oro)" }} opacity=".3" className="esfera-nueva" /> : null}
      {ESFERAS.map(([x, y], i) =>
        i < esferas ? (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={ultima && i === esferas - 1 ? 6 : 4.5}
            style={{ fill: COLOR_ESFERA[i % COLOR_ESFERA.length] }}
            stroke={ultima && i === esferas - 1 ? "#fff" : undefined}
            strokeWidth={1.5}
          />
        ) : (
          <circle key={i} cx={x} cy={y} r="3.5" fill="none" stroke="#fff" strokeOpacity=".3" strokeDasharray="2 2" />
        )
      )}
    </svg>
  )
}

/** Inicio (R100): la cuenta regresiva y la tarjeta del arbolito */
export function ArbolitoCard({ temporada, esferas }: { temporada: Temporada; esferas: number }) {
  const completo = esferas >= NAVIDAD.esferas
  const titulo = !temporada.cuentaEsferas ? "¡Feliz Navidad!" : completo ? "¡Completaste tu arbolito!" : "Tu arbolito de la Línea"
  const texto = !temporada.cuentaEsferas
    ? `Tu arbolito quedó con ${esferas} ${esferas === 1 ? "esfera" : "esferas"}. Gracias por viajar con la Línea.`
    : completo
      ? "Tus 24 esferas ya brillan. ¡Felices fiestas!"
      : `Cada viaje cuelga una esfera hasta Navidad. Llevas ${esferas} de ${NAVIDAD.esferas}.`

  return (
    <section className="flex flex-col gap-2">
      {temporada.cuentaRegresiva ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--navidad-texto)]">
          <Sparkles className="size-4" /> {temporada.cuentaRegresiva}
        </p>
      ) : null}
      <div className="flex items-center gap-4 rounded-3xl border bg-card p-4 text-card-foreground">
        <Arbolito esferas={esferas} className="arbolito h-[78px] w-[60px]" />
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-semibold">{titulo}</p>
          <p className="text-sm text-muted-foreground">{texto}</p>
          {temporada.cuentaEsferas && !completo ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={NAVIDAD.esferas} aria-valuenow={esferas} aria-label="Esferas de tu arbolito">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--navidad-rojo),var(--navidad-oro),var(--navidad-verde))]"
                style={{ width: `${(esferas / NAVIDAD.esferas) * 100}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/** A Valle Grande (R99): la frase del día mientras espera */
export function FraseDelDia({ frase }: { frase: string }) {
  return (
    <p className="flex items-center gap-3 rounded-3xl border bg-card p-4 text-sm text-muted-foreground">
      <span aria-hidden className="text-xl">🎄</span>
      <span>
        Mientras esperas: <span className="font-medium text-foreground">{frase}</span>
      </span>
    </p>
  )
}

/** R98: la marca que enciende el tema en globals.css (`:root:has([data-temporada="navidad"])`) */
export function MarcaTemporada() {
  return <span hidden data-temporada="navidad" />
}
