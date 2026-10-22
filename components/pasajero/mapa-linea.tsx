"use client"

import "leaflet/dist/leaflet.css"

import type { Map as MapaLeaflet, Marker } from "leaflet"
import { SnowflakeIcon, StarIcon } from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

import { promedioTexto } from "@/components/estrellas"
import { Avatar } from "@/components/foto/avatar"
import {
  apuntar,
  CENTRO_INICIAL,
  deslizar,
  iconoCarro,
  REVISAR_MS,
  ZOOM_CALLE,
} from "@/components/pasajero/ver-en-mapa"
import { posicionesDeLaLinea } from "@/lib/acciones/pasajero"
import type { ChoferEnServicio } from "@/lib/datos/inicio-pasajero"
import { hace } from "@/lib/fechas"
import {
  distanciaMetros,
  EN_VIVO_MS,
  MOVIMIENTO_MINIMO_M,
  POSICION_VIEJA_MS,
  rumbo,
  type Punto,
} from "@/lib/mapa"
import { crearClienteNavegador } from "@/lib/supabase/cliente-navegador"
import { cn } from "@/lib/utils"

type Posicion = { lat: number; lng: number; actualizadaEn: string }

/**
 * La línea (docs/especificacion.md §8): un mapa con todos los choferes que comparten su ubicación (nombre, flecha
 * de hacia dónde va, gris sin señal) y, debajo, quién está trabajando. Tocar un chofer lo centra en el mapa.
 * Las posiciones llegan por Realtime; cada 60 s se vuelven a leer para descartar las viejas (R42).
 */
export function MapaLinea({ choferes }: { choferes: ChoferEnServicio[] }) {
  const [posiciones, setPosiciones] = useState<Record<string, Posicion>>({})
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const L = useRef<typeof import("leaflet") | null>(null)
  const marcadores = useRef(new Map<string, Marker>())
  const anterior = useRef(new Map<string, Punto>()) // última posición usada para el rumbo, por chofer
  const giros = useRef(new Map<string, { current: number | null }>())
  const encuadrado = useRef(false)
  const [listo, setListo] = useState(false)
  const ids = choferes.map((c) => c.id).join(",")

  // Reloj: "Sin señal" y "hace N min" se actualizan solos
  const suscribir = useCallback((avisar: () => void) => {
    const id = setInterval(avisar, 10_000)
    return () => clearInterval(id)
  }, [])
  const ahora = useSyncExternalStore(
    suscribir,
    () => Math.floor(Date.now() / 10_000) * 10_000,
    () => 0
  )

  // Crear el mapa una vez
  useEffect(() => {
    let cancelado = false
    const lista = marcadores.current
    void import("leaflet").then((leaflet) => {
      if (cancelado || !contenedor.current || mapa.current) return
      const m = leaflet.map(contenedor.current, { zoomControl: true })
      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(m)
      m.setView(CENTRO_INICIAL, 13)
      mapa.current = m
      L.current = leaflet
      setListo(true)
    })
    return () => {
      cancelado = true
      mapa.current?.remove()
      mapa.current = null
      lista.clear()
      encuadrado.current = false
    }
  }, [])

  // Posiciones: al abrir, cada 60 s y por Realtime cada vez que un chofer envía la suya
  useEffect(() => {
    let vivo = true
    const leer = () =>
      posicionesDeLaLinea().then(
        (p) => vivo && setPosiciones(p),
        () => {}
      )
    void leer()
    const id = setInterval(leer, REVISAR_MS)
    const supabase = crearClienteNavegador()
    const canal = supabase
      .channel(`linea:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posiciones" },
        (cambio) => {
          const p = cambio.new as {
            chofer_id?: string
            lat?: number
            lng?: number
            actualizada_en?: string
          }
          if (
            !vivo ||
            !p.chofer_id ||
            p.lat === undefined ||
            p.lng === undefined ||
            !p.actualizada_en
          )
            return
          const { chofer_id, lat, lng, actualizada_en } = p
          setPosiciones((antes) => ({
            ...antes,
            [chofer_id]: { lat, lng, actualizadaEn: actualizada_en },
          }))
        }
      )
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return
      if (data.session)
        await supabase.realtime.setAuth(data.session.access_token)
      canal.subscribe()
    })
    return () => {
      vivo = false
      clearInterval(id)
      void supabase.removeChannel(canal)
    }
  }, [])

  // Pintar: un 🚐 por chofer con posición reciente, con su nombre; gris sin señal
  useEffect(() => {
    const m = mapa.current
    const leaflet = L.current
    if (!listo || !m || !leaflet) return
    const visibles = choferes.filter((c) => {
      const p = posiciones[c.id]
      return (
        p && ahora - new Date(p.actualizadaEn).getTime() < POSICION_VIEJA_MS
      )
    })

    for (const [id, marcador] of marcadores.current) {
      if (!visibles.some((c) => c.id === id)) {
        marcador.remove()
        marcadores.current.delete(id)
      }
    }
    for (const c of visibles) {
      const p = posiciones[c.id]
      let marcador = marcadores.current.get(c.id)
      if (marcador) deslizar(marcador, p)
      else {
        marcador = leaflet
          .marker(p, { icon: iconoCarro(leaflet) })
          .bindTooltip(c.nombre.split(" ")[0], {
            permanent: true,
            direction: "top",
            offset: [0, -24],
          })
          .addTo(m)
        marcadores.current.set(c.id, marcador)
      }
      const giro = giros.current.get(c.id) ?? { current: null }
      giros.current.set(c.id, giro)
      const antes = anterior.current.get(c.id)
      if (!antes) anterior.current.set(c.id, p)
      else if (distanciaMetros(antes, p) >= MOVIMIENTO_MINIMO_M) {
        apuntar(marcador, rumbo(antes, p), giro)
        anterior.current.set(c.id, p)
      }
      const el = marcador.getElement()
      if (el)
        el.style.filter =
          ahora - new Date(p.actualizadaEn).getTime() < EN_VIVO_MS
            ? ""
            : "grayscale(1) opacity(.5)"
    }

    // Al abrir: encuadrar a todos los que se ven
    if (!encuadrado.current && visibles.length > 0) {
      const puntos = visibles.map((c) => posiciones[c.id])
      if (puntos.length === 1) m.setView(puntos[0], ZOOM_CALLE - 1)
      else
        m.fitBounds(leaflet.latLngBounds(puntos), {
          padding: [48, 48],
          maxZoom: ZOOM_CALLE - 1,
        })
      encuadrado.current = true
    }
    // ids: si cambia quién trabaja, se repinta
  }, [posiciones, listo, ahora, choferes, ids])

  const centrar = (id: string) => {
    const p = posiciones[id]
    if (!p || !mapa.current) return
    mapa.current.setView(p, ZOOM_CALLE)
    contenedor.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const conUbicacion = choferes.filter(
    (c) =>
      posiciones[c.id] &&
      ahora - new Date(posiciones[c.id].actualizadaEn).getTime() <
        POSICION_VIEJA_MS
  )

  return (
    <div className="flex flex-col gap-4">
      {/* isolate: los z-index de Leaflet (hasta 1000) quedan adentro; si no, el mapa tapa el menú lateral */}
      <div className="relative isolate">
        <div
          ref={contenedor}
          className="h-[50svh] w-full overflow-hidden rounded-2xl border-2 bg-muted md:h-[60svh]"
        />
        {listo && conUbicacion.length === 0 && (
          <p className="absolute inset-x-4 top-4 z-[1001] rounded-2xl border-2 bg-card px-4 py-3 text-center font-bold shadow-md">
            {choferes.length === 0
              ? "Ningún chofer trabajando ahora"
              : "Ningún chofer está compartiendo su ubicación ahora"}
          </p>
        )}
      </div>

      {choferes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {choferes.map((c) => {
            const p = posiciones[c.id]
            const edad = p
              ? ahora - new Date(p.actualizadaEn).getTime()
              : Infinity
            const enMapa = edad < POSICION_VIEJA_MS
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => centrar(c.id)}
                  disabled={!enMapa}
                  className="flex w-full items-center gap-3 rounded-2xl border-2 bg-card px-3 py-2.5 text-left hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default disabled:hover:bg-card"
                >
                  <Avatar
                    url={c.fotoUrl}
                    nombre={c.nombre}
                    className="size-12 text-base"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 font-bold">
                      <span className="truncate">{c.nombre}</span>
                      {c.estrellas !== null && (
                        <span className="inline-flex items-center gap-0.5 text-sm">
                          <StarIcon
                            aria-hidden
                            className="size-4 fill-signal text-signal"
                          />
                          {promedioTexto(c.estrellas)}
                          <span className="sr-only"> estrellas</span>
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "block text-sm",
                        c.actividad === "Disponible"
                          ? "text-muted-foreground"
                          : "font-bold text-primary"
                      )}
                    >
                      {c.actividad}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                      {c.placa && (
                        <span className="font-mono font-bold tracking-wider text-foreground">
                          {c.placa}
                        </span>
                      )}
                      {c.unidad && <span>Unidad {c.unidad}</span>}
                      {c.aire && (
                        <span className="inline-flex items-center gap-1">
                          <SnowflakeIcon aria-hidden className="size-3.5" /> Con
                          aire
                        </span>
                      )}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-sm font-bold",
                      !enMapa
                        ? "bg-muted text-muted-foreground"
                        : edad < EN_VIVO_MS
                          ? "bg-success-muted text-success"
                          : "bg-warning-muted text-warning"
                    )}
                  >
                    {!enMapa
                      ? "Sin ubicación"
                      : edad < EN_VIVO_MS
                        ? "● En vivo"
                        : `Sin señal · ${hace(p.actualizadaEn)}`}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
