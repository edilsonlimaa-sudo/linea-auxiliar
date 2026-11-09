"use client"

import { MoonStar, Sun } from "lucide-react"
import { useCallback, useSyncExternalStore } from "react"

import { bolivares } from "@/lib/bancos"
import { avisoDeTarifa, PASAJE_ESPECIAL, tarifaEn } from "@/lib/tarifas"

// Avisos de Inicio en la interfaz nueva: la tarifa especial (R80), como chip debajo de "¿Hacia dónde vas?" (§8). Por
// qué se cerró su reserva es una pantalla aparte (se-cerro.tsx).

/** La hora, al minuto, para que el chip aparezca y se vaya solo (null en el servidor: depende del reloj del teléfono) */
function useMinuto(): number | null {
  const suscribir = useCallback((avisar: () => void) => {
    const id = setInterval(avisar, 60_000)
    return () => clearInterval(id)
  }, [])
  const ahora = useSyncExternalStore(suscribir, () => Math.floor(Date.now() / 60_000) * 60_000, () => 0)
  return ahora === 0 ? null : ahora
}

/**
 * La tarifa especial (R80): solo mientras rige o media hora antes de la nocturna. Sin ✕: se va sola cuando deja de regir.
 * "Domingo · Bs. 1.300", "Tarifa nocturna · Bs. 1.300", "Desde las 6 p. m. · Bs. 1.300"
 */
export function ChipTarifa() {
  const ahora = useMinuto()
  if (ahora === null) return null
  const fecha = new Date(ahora)
  if (!avisoDeTarifa(fecha)) return null
  const { tipo } = tarifaEn(fecha)
  const monto = bolivares(PASAJE_ESPECIAL)
  const texto = tipo === "domingo" ? `Domingo · ${monto}` : tipo === "nocturna" ? `Tarifa nocturna · ${monto}` : `Desde las 6 p. m. · ${monto}`
  const Icono = tipo === "domingo" ? Sun : MoonStar
  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
      <Icono className="size-4 text-primary" />
      {texto}
    </span>
  )
}
