"use client"

import { CheckIcon, HistoryIcon } from "lucide-react"
import { useId, useState, useSyncExternalStore } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const CLAVE_GPS = "linea-auxiliar:agregar-gps"
const leerGps = () => {
  try {
    return localStorage.getItem(CLAVE_GPS) === "1"
  } catch {
    return false
  }
}
const suscribirse = () => () => {}

/** Recuerda si la persona suele agregar su GPS (R26). Sin almacenamiento disponible, empieza apagado. */
export function useGpsRecordado() {
  const guardado = useSyncExternalStore(suscribirse, leerGps, () => false)
  const [elegido, setElegido] = useState<boolean | null>(null)
  const valor = elegido ?? guardado
  const cambiar = (v: boolean) => {
    setElegido(v)
    try {
      localStorage.setItem(CLAVE_GPS, v ? "1" : "0")
    } catch {}
  }
  return [valor, cambiar] as const
}

/** Pide la ubicación al teléfono. Devuelve null si la persona no da permiso o tarda demasiado. */
export function obtenerUbicacion(): Promise<{ lat: number; lng: number } | null> {
  if (!("geolocation" in navigator)) return Promise.resolve(null)
  return new Promise((resolver) =>
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolver(null),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    )
  )
}

const OTRO = Symbol("otro")

/**
 * Estado del "¿Dónde estás?" (R25): un lugar reciente escogido con un toque u otro escrito a mano.
 * Empieza con el lugar inicial (p. ej. el de la espera, R27) o con el más reciente.
 */
export function useLugar(recientes: string[], inicial?: string | null) {
  const primero = inicial ?? recientes[0]
  const [elegido, setElegido] = useState<string | typeof OTRO>(primero && recientes.includes(primero) ? primero : OTRO)
  const [escrito, setEscrito] = useState(primero && !recientes.includes(primero) ? primero : "")
  const valor = (elegido === OTRO ? escrito : elegido).trim()
  return { recientes, elegido, escrito, valor, elegir: setElegido, escribir: (t: string) => (setEscrito(t), setElegido(OTRO)) }
}

/** Lugares recientes (un toque) + campo de texto libre. El chofer ve este texto en grande. */
export function ElegirLugar({ lugar, error }: { lugar: ReturnType<typeof useLugar>; error?: string }) {
  const id = useId()
  const { recientes, elegido, escrito, elegir, escribir } = lugar
  const hayRecientes = recientes.length > 0

  return (
    <div className="flex flex-col gap-3">
      {hayRecientes && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">¿Dónde estás?</legend>
          {recientes.map((r) => {
            const activo = elegido === r
            return (
              <label
                key={r}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 bg-card px-4 py-2.5 transition-colors has-focus-visible:ring-[3px] has-focus-visible:ring-ring",
                  activo ? "border-primary bg-secondary" : "border-border hover:bg-muted"
                )}
              >
                <input type="radio" name="lugar-reciente" checked={activo} onChange={() => elegir(r)} className="sr-only" />
                <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-full", activo ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {activo ? <CheckIcon className="size-5" /> : <HistoryIcon className="size-5" />}
                </span>
                <span className="min-w-0 font-bold">{r}</span>
              </label>
            )
          })}
        </fieldset>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="font-bold">
          {hayRecientes ? "U otro lugar" : "¿Dónde estás?"}
        </label>
        <Input
          id={id}
          value={escrito}
          onChange={(e) => escribir(e.target.value)}
          onFocus={() => escribir(escrito)}
          maxLength={60}
          placeholder="Ej.: entrada de Las Cayenas"
          autoComplete="off"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={`${id}-ayuda${error ? ` ${id}-error` : ""}`}
        />
        <p id={`${id}-ayuda`} className="text-[15px] text-muted-foreground">
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

/** Casilla del GPS (R26): opcional, pero basta sola para quien no sabe explicar dónde está */
export function CasillaGps({ marcada, onCambiar }: { marcada: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <label className="flex min-h-13 cursor-pointer items-center gap-3 rounded-2xl bg-muted px-4 py-3 has-focus-visible:ring-[3px] has-focus-visible:ring-ring">
      <input type="checkbox" checked={marcada} onChange={(e) => onCambiar(e.target.checked)} className="size-6 shrink-0 accent-primary" />
      <span>
        <span className="block font-bold">Agregar mi ubicación GPS</span>
        <span className="block text-[15px] text-muted-foreground">El chofer podrá abrir el mapa. Si no sabes explicar dónde estás, con el GPS basta.</span>
      </span>
    </label>
  )
}

/**
 * Arma los datos del lugar para enviar: texto y, si se pidió, el GPS.
 * Devuelve un mensaje de error si falta todo o si el GPS falló y no hay texto.
 */
export async function datosDelLugar(texto: string, gps: boolean): Promise<{ datos: FormData } | { error: string }> {
  if (!texto && !gps) return { error: "Escribe dónde estás o marca tu ubicación GPS." }
  const datos = new FormData()
  if (texto) datos.set("lugar", texto)
  if (gps) {
    const ubicacion = await obtenerUbicacion()
    if (ubicacion) {
      datos.set("lat", String(ubicacion.lat))
      datos.set("lng", String(ubicacion.lng))
    } else if (!texto) {
      return { error: "No pudimos ver tu ubicación. Revisa el permiso del GPS o escribe dónde estás." }
    }
  }
  return { datos }
}
