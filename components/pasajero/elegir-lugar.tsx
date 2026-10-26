"use client"

import { useId, useState } from "react"

import { Input } from "@/components/ui/input"

/**
 * Estado del "¿Dónde estás?" (R25): solo el texto escrito. Empieza con el lugar inicial (p. ej. el lugar actual al
 * cambiarlo en Mi viaje, R27) o vacío.
 */
export function useLugar(inicial?: string | null) {
  const [escrito, escribir] = useState(inicial ?? "")
  return { escrito, valor: escrito.trim(), escribir }
}

/** El campo "¿Dónde estás?": texto libre. El chofer ve este texto en grande. */
export function ElegirLugar({ lugar, error }: { lugar: ReturnType<typeof useLugar>; error?: string }) {
  const id = useId()
  const { escrito, escribir } = lugar

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="font-bold">
          ¿Dónde estás?
        </label>
        <Input
          id={id}
          value={escrito}
          onChange={(e) => escribir(e.target.value)}
          maxLength={60}
          placeholder="Ej.: entrada de Las Cayenas"
          autoComplete="off"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={`${id}-ayuda${error ? ` ${id}-error` : ""}`}
        />
        <p id={`${id}-ayuda`} className="text-sm text-muted-foreground">
          Calle, casa o negocio de referencia. El chofer lo ve en grande.
        </p>
        {error && (
          <p id={`${id}-error`} role="alert" className="font-bold text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

/** Arma los datos del lugar para enviar: solo el texto escrito (R26: sin GPS del pasajero) */
export function datosDelLugar(texto: string): { datos: FormData } | { error: string } {
  if (!texto) return { error: "Escribe dónde estás." }
  const datos = new FormData()
  datos.set("lugar", texto)
  return { datos }
}
