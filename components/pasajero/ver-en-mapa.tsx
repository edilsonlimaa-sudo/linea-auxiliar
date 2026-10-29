"use client"

import "leaflet/dist/leaflet.css"

import type { Map as MapaLeaflet, Marker } from "leaflet"
import { Loader2Icon, LocateFixedIcon, MapIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { posicionDeChofer, type PosicionChofer } from "@/lib/acciones/pasajero"
import { hace } from "@/lib/fechas"
import { distanciaMetros, distanciaTexto, EN_VIVO_MS, MOVIMIENTO_MINIMO_M, POSICION_VIEJA_MS, rumbo, type Punto } from "@/lib/mapa"
import { cn } from "@/lib/utils"
import { crearClienteNavegador } from "@/lib/supabase/cliente-navegador"

// Con el mapa abierto la posición llega por Realtime; cada 60 s se vuelve a leer para descartar la vieja (R42)
export const REVISAR_MS = 60_000
export const CENTRO_INICIAL: Punto = { lat: 9.7457, lng: -63.1832 } // Maturín

/** Marcador sin imágenes (los íconos por defecto de Leaflet no viajan bien con el empaquetador) */
const icono = (L: typeof import("leaflet"), emoji: string, etiqueta: string) =>
  L.divIcon({
    className: "",
    html: `<div role="img" aria-label="${etiqueta}" style="font-size:34px;line-height:1;filter:drop-shadow(0 1px 2px rgb(0 0 0 / .45))">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 30],
  })

/**
 * Marcador del carro: el 🚐 en pie (mira a la izquierda o a la derecha) y una flecha alrededor que apunta hacia
 * dónde va (R41). La flecha empieza escondida hasta que hay rumbo.
 */
export const iconoCarro = (L: typeof import("leaflet")) =>
  L.divIcon({
    className: "",
    html: `<div role="img" aria-label="El carro" style="position:relative;width:56px;height:56px">
      <div data-flecha style="position:absolute;inset:0;display:none;transition:transform .6s ease-out">
        <div style="position:absolute;left:50%;top:-2px;transform:translateX(-50%);width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:15px solid var(--primary);filter:drop-shadow(0 0 1.5px var(--background)) drop-shadow(0 0 1.5px var(--background))"></div>
      </div>
      <div data-emoji style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:32px;line-height:1;transition:transform .3s;filter:drop-shadow(0 1px 2px rgb(0 0 0 / .45))">🚐</div>
    </div>`,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  })

/** Interfaz nueva: un carro visto desde arriba, con el frente hacia el norte; gira entero hacia donde va */
export const iconoCarroArriba = (L: typeof import("leaflet")) =>
  L.divIcon({
    className: "",
    html: `<div role="img" aria-label="El carro" style="width:48px;height:48px;display:flex;align-items:center;justify-content:center">
      <div data-giro style="transition:transform .6s ease-out;filter:drop-shadow(0 2px 3px rgb(0 0 0 / .35))">
        <svg width="26" height="44" viewBox="0 0 26 44" aria-hidden="true">
          <rect x="1" y="1" width="24" height="42" rx="9" style="fill:var(--primary)" stroke="#fff" stroke-width="2"/>
          <rect x="0" y="13" width="3" height="5" rx="1.5" style="fill:var(--primary)"/>
          <rect x="23" y="13" width="3" height="5" rx="1.5" style="fill:var(--primary)"/>
          <path d="M5.5 13.5 Q13 9 20.5 13.5 L19.5 18.5 Q13 16.5 6.5 18.5 Z" fill="#dbe7ff"/>
          <path d="M6.5 32 Q13 33.5 19.5 32 L20 36 Q13 38.5 6 36 Z" fill="#dbe7ff" opacity=".85"/>
          <rect x="6.5" y="20" width="13" height="10.5" rx="2" fill="#fff" opacity=".18"/>
          <circle cx="6" cy="4.5" r="1.6" fill="#fff7c2"/>
          <circle cx="20" cy="4.5" r="1.6" fill="#fff7c2"/>
        </svg>
      </div>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  })

/**
 * Apunta la flecha al rumbo. `giro` acumula el ángulo para que la flecha gire por el lado corto (de 350° a 10°
 * avanza 20°, no retrocede 340°). El 🚐 de los emojis mira a la izquierda: hacia el este se refleja.
 */
export function apuntar(marcador: Marker, grados: number, giro: { current: number | null }) {
  const el = marcador.getElement()
  const entero = el?.querySelector<HTMLElement>("[data-giro]")
  if (entero) {
    // El carro visto desde arriba gira entero, por el lado corto
    if (giro.current === null) giro.current = grados
    else giro.current += ((grados - ((giro.current % 360) + 360) % 360 + 540) % 360) - 180
    entero.style.transform = `rotate(${giro.current}deg)`
    return
  }
  const flecha = el?.querySelector<HTMLElement>("[data-flecha]")
  const emoji = el?.querySelector<HTMLElement>("[data-emoji]")
  if (!flecha || !emoji) return
  if (giro.current === null) giro.current = grados
  else {
    const actual = ((giro.current % 360) + 360) % 360
    giro.current += ((grados - actual + 540) % 360) - 180
  }
  flecha.style.display = "block"
  flecha.style.transform = `rotate(${giro.current}deg)`
  // Casi norte o casi sur: se deja como estaba (no se voltea a cada rato)
  const esteOeste = Math.sin((grados * Math.PI) / 180)
  if (Math.abs(esteOeste) > 0.2) emoji.style.transform = esteOeste > 0 ? "scaleX(-1)" : "none"
}

// Zoom de calle: se distinguen las cuadras y el nombre de las calles
export const ZOOM_CALLE = 17

/** Desliza el marcador hasta la posición nueva (1 s) en vez de saltar */
export function deslizar(marcador: Marker, destino: Punto) {
  const desde = marcador.getLatLng()
  const inicio = performance.now()
  const paso = (ahora: number) => {
    const t = Math.min(1, (ahora - inicio) / 1000)
    const suave = 1 - (1 - t) ** 3
    marcador.setLatLng({ lat: desde.lat + (destino.lat - desde.lat) * suave, lng: desde.lng + (destino.lng - desde.lng) * suave })
    if (t < 1) requestAnimationFrame(paso)
  }
  requestAnimationFrame(paso)
}

/**
 * Mapa en vivo (R41). Al abrir encuadra a nivel de calle; después sigue al carro sin tocar el zoom (solo se desliza
 * cuando el carro se acerca al borde). Si la persona mueve o acerca el mapa, deja de seguir y aparece "Seguir al carro".
 */
export function Mapa({
  carro,
  yo,
  senal,
  nueva = false,
}: {
  carro: PosicionChofer
  yo: Punto | null
  senal: { enVivo: boolean; texto: string } | null
  nueva?: boolean // interfaz nueva: el carro visto desde arriba y sus colores; arrastrar el mapa no mueve la hoja
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const marcadores = useRef<{ L: typeof import("leaflet"); carro?: Marker; yo?: Marker } | null>(null)
  const [listo, setListo] = useState(false)
  const encuadrado = useRef(false) // ya se hizo el encuadre inicial con el carro
  const automatico = useRef(false) // el movimiento lo hace el código, no la persona
  const siguiendoRef = useRef(true)
  const [siguiendo, setSiguiendo] = useState(true)
  const anterior = useRef<Punto | null>(null) // última posición usada para calcular el rumbo
  const giro = useRef<number | null>(null) // ángulo acumulado de la flecha

  /**
   * Movimientos del código: no cuentan como "la persona movió el mapa". La animación de Leaflet empieza en el
   * cuadro siguiente, así que la marca dura hasta que termina (moveend), con un respaldo por si no hay movimiento.
   */
  const mover = (accion: () => void) => {
    const m = mapa.current
    if (!m) return
    automatico.current = true
    const soltar = () => {
      automatico.current = false
      clearTimeout(respaldo)
    }
    const respaldo = setTimeout(() => (m.off("moveend", soltar), soltar()), 1500)
    m.once("moveend", soltar)
    accion()
  }

  // Crear el mapa una vez (Leaflet usa window: se carga solo en el navegador)
  useEffect(() => {
    let cancelado = false
    void import("leaflet").then((L) => {
      if (cancelado || !contenedor.current || mapa.current) return
      const m = L.map(contenedor.current, { zoomControl: true, attributionControl: true })
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m)
      m.setView(CENTRO_INICIAL, 13)
      // Arrastrar o hacer zoom con el dedo (o los botones +/−) deja de seguir al carro
      const dejarDeSeguir = () => {
        if (automatico.current || !encuadrado.current) return
        siguiendoRef.current = false
        setSiguiendo(false)
      }
      m.on("dragstart", dejarDeSeguir)
      m.on("zoomstart", dejarDeSeguir)
      mapa.current = m
      marcadores.current = { L }
      // La hoja termina de abrirse después: Leaflet necesita recalcular su tamaño
      setTimeout(() => m.invalidateSize(), 300)
      setListo(true)
    })
    return () => {
      cancelado = true
      mapa.current?.remove()
      mapa.current = null
      marcadores.current = null
      encuadrado.current = false
    }
  }, [])

  // Posición nueva: mover los marcadores y, si está siguiendo, mantener el carro a la vista
  useEffect(() => {
    const m = mapa.current
    const mk = marcadores.current
    if (!listo || !m || !mk) return
    const { L } = mk

    if (yo) {
      mk.yo ??= L.marker(yo, { icon: icono(L, "📍", "Tú") }).addTo(m)
      mk.yo.setLatLng(yo)
    }
    if (!carro) {
      mk.carro?.remove()
      mk.carro = undefined
      if (yo && !encuadrado.current) mover(() => m.setView(yo, ZOOM_CALLE - 1))
      return
    }

    if (mk.carro) deslizar(mk.carro, carro)
    else {
      mk.carro = L.marker(carro, { icon: nueva ? iconoCarroArriba(L) : iconoCarro(L), zIndexOffset: 1000 }).addTo(m)
      // Marcador nuevo (p. ej. volvió a compartir): retoma el último rumbo conocido
      if (giro.current !== null) apuntar(mk.carro, ((giro.current % 360) + 360) % 360, { current: null })
    }

    // Hacia dónde va: solo con un movimiento real (los saltitos del GPS no cambian el rumbo)
    if (!anterior.current) anterior.current = carro
    else if (distanciaMetros(anterior.current, carro) >= MOVIMIENTO_MINIMO_M) {
      apuntar(mk.carro, rumbo(anterior.current, carro), giro)
      anterior.current = carro
    }

    if (!encuadrado.current) {
      // Primera posición: nivel de calle; con el pasajero, los dos a la vista
      mover(() =>
        yo ? m.fitBounds(L.latLngBounds([carro, yo]), { padding: [56, 56], maxZoom: ZOOM_CALLE }) : m.setView(carro, ZOOM_CALLE)
      )
      encuadrado.current = true
    } else if (siguiendoRef.current && !m.getBounds().pad(-0.2).contains(carro)) {
      // Se acerca al borde: deslizar el mapa sin cambiar el zoom que haya escogido
      mover(() => m.panTo(carro))
    }
  }, [carro, yo, listo, nueva])

  // Sin señal: el 🚐 queda gris y semitransparente en la última posición conocida (R42)
  const enVivo = senal?.enVivo ?? true
  useEffect(() => {
    const el = marcadores.current?.carro?.getElement()
    if (el) el.style.filter = enVivo ? "" : "grayscale(1) opacity(.5)"
  }, [enVivo, carro, listo])

  const seguirAlCarro = () => {
    const m = mapa.current
    if (!m || !carro) return
    siguiendoRef.current = true
    setSiguiendo(true)
    mover(() => m.setView(carro, Math.max(m.getZoom(), ZOOM_CALLE - 1)))
  }

  // isolate: los z-index de Leaflet (hasta 1000) quedan adentro; si no, el mapa tapa el menú lateral
  return (
    <div className="relative isolate">
      <div
        ref={contenedor}
        data-base-ui-swipe-ignore={nueva ? "" : undefined}
        className={cn("w-full overflow-hidden bg-muted", nueva ? "h-[50svh] rounded-3xl border" : "h-[55svh] rounded-2xl border-2")}
      />
      {senal && (
        // Arriba a la derecha (el zoom está a la izquierda), encima de los controles de Leaflet
        <p
          className={cn(
            "absolute top-3 right-3 z-[1001] flex items-center gap-1.5 rounded-full px-3 py-1 text-sm shadow-md",
            nueva
              ? senal.enVivo
                ? "bg-emerald-600 font-medium text-white"
                : "bg-amber-100 font-medium text-amber-800"
              : cn("border-2 font-bold", senal.enVivo ? "border-success bg-success text-success-foreground" : "border-warning bg-warning-muted text-warning")
          )}
        >
          {senal.enVivo && <span aria-hidden className={cn("size-2 animate-pulse rounded-full", nueva ? "bg-white" : "bg-success-foreground")} />}
          {senal.texto}
        </p>
      )}
      {!siguiendo && carro && (
        // Encima de los controles de Leaflet (z-index hasta 1000)
        <Button size="sm" onClick={seguirAlCarro} className="absolute bottom-4 left-1/2 z-[1001] -translate-x-1/2 shadow-lg">
          <LocateFixedIcon aria-hidden />
          Seguir al carro
        </Button>
      )}
    </div>
  )
}

/**
 * La posición del chofer mientras el mapa está abierto: se lee una vez, llega por Realtime cada vez que el chofer la
 * envía y se vuelve a leer cada 60 s (R42). `ahora` es un reloj de 10 s para "hace N min" y "Sin señal".
 */
export function usePosicionEnVivo(choferId: string, abierta: boolean) {
  const [carro, setCarro] = useState<PosicionChofer | undefined>(undefined) // undefined = cargando

  useEffect(() => {
    if (!abierta) return
    let vivo = true
    const leer = () => posicionDeChofer(choferId).then((p) => vivo && setCarro(p), () => {})
    void leer()
    const id = setInterval(leer, REVISAR_MS)

    // Cada posición nueva de este chofer llega sola (RLS: solo de choferes conectados)
    const supabase = crearClienteNavegador()
    const canal = supabase.channel(`posicion:${choferId}:${crypto.randomUUID()}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "posiciones", filter: `chofer_id=eq.${choferId}` },
      (cambio) => {
        const p = cambio.new as { lat?: number; lng?: number; actualizada_en?: string }
        if (!vivo || p.lat === undefined || p.lng === undefined || !p.actualizada_en) return
        if (Date.now() - new Date(p.actualizada_en).getTime() > POSICION_VIEJA_MS) return
        setCarro({ lat: p.lat, lng: p.lng, actualizadaEn: p.actualizada_en })
      }
    )
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return
      if (data.session) await supabase.realtime.setAuth(data.session.access_token)
      canal.subscribe()
    })
    return () => {
      vivo = false
      clearInterval(id)
      void supabase.removeChannel(canal)
    }
  }, [abierta, choferId])

  // Reloj que solo corre con el mapa abierto: "hace N min" y "Sin señal" se actualizan solos (R42)
  const suscribir = useCallback(
    (avisar: () => void) => {
      if (!abierta) return () => {}
      const id = setInterval(avisar, 10_000)
      return () => clearInterval(id)
    },
    [abierta]
  )
  const ahora = useSyncExternalStore(suscribir, () => Math.floor(Date.now() / 10_000) * 10_000, () => 0)

  return { carro, setCarro, ahora }
}

/**
 * "Ver en el mapa" (R41): por dónde viene el carro y, si compartió GPS, dónde está el pasajero y a qué distancia.
 * Solo mientras la hoja está abierta: lee la posición y después la recibe por Realtime cada vez que el chofer la envía.
 */
export function VerEnMapa({
  choferId,
  chofer,
  yo,
  admin = false,
  className = "w-full",
  compacto = false,
}: {
  choferId: string
  chofer: string
  yo: Punto | null
  admin?: boolean // el panel del admin sigue a cualquier chofer conectado (§8): sin "viene" ni "comparte tu GPS"
  className?: string
  compacto?: boolean // botón chico, solo el ícono (en las tarjetas de unidad, §8)
}) {
  const [abierta, setAbierta] = useState(false)
  const { carro, setCarro, ahora } = usePosicionEnVivo(choferId, abierta)

  const nombre = chofer.split(" ")[0]
  const distancia = carro && yo ? distanciaTexto(distanciaMetros(carro, yo)) : null
  const enVivo = carro ? ahora - new Date(carro.actualizadaEn).getTime() < EN_VIVO_MS : false
  const cuando = carro ? hace(carro.actualizadaEn) : ""
  const senal = carro ? { enVivo, texto: enVivo ? "En vivo" : `Sin señal · última ${cuando}` } : null

  return (
    <Sheet open={abierta} onOpenChange={(v) => (setAbierta(v), !v && setCarro(undefined))}>
      {compacto ? (
        <SheetTrigger render={<Button variant="outline" size="icon" aria-label={`Ver en el mapa por dónde va ${chofer.split(" ")[0]}`} className="size-10 shrink-0" />}>
          <MapIcon aria-hidden className="size-6" />
        </SheetTrigger>
      ) : (
        <SheetTrigger render={<Button variant="outline" className={className} />}>
          <MapIcon aria-hidden />
          Ver en el mapa
        </SheetTrigger>
      )}
      <SheetContent side="bottom" className="mx-auto max-w-2xl">
        <SheetHeader>
          <SheetTitle>{admin ? `Dónde está ${nombre}` : `Por dónde viene ${nombre}`}</SheetTitle>
          <SheetDescription className="text-base" aria-live="polite">
            {carro === undefined
              ? "Buscando el carro…"
              : carro === null
                ? `${nombre} no está compartiendo su ubicación ahora.`
                : !enVivo
                  ? `Sin señal: la última ubicación es de ${cuando}. Puede que ${nombre} haya cerrado la app o perdido la señal.`
                  : distancia
                    ? `El carro está a ${distancia} de ti · actualizado ${cuando}.`
                    : admin
                      ? `En vivo · actualizado ${cuando}.`
                      : `Actualizado ${cuando}. Comparte tu GPS al avisar que esperas para ver a qué distancia está.`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          {carro === undefined && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2Icon aria-hidden className="size-5 animate-spin" /> Cargando…
            </p>
          )}
          {abierta && <Mapa carro={carro ?? null} yo={yo} senal={senal} />}
          <p className="text-sm text-muted-foreground">🚐 el carro{yo ? " · 📍 tú" : ""}. Se mueve solo cuando el chofer envía su ubicación.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
