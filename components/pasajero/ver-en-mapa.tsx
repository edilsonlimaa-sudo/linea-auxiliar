"use client"

import "leaflet/dist/leaflet.css"

import type { Map as MapaLeaflet, Marker } from "leaflet"
import { Loader2Icon, LocateFixedIcon, MapIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { posicionDeChofer, type PosicionChofer } from "@/lib/acciones/pasajero"
import { hace } from "@/lib/fechas"
import { distanciaMetros, distanciaTexto, POSICION_VIEJA_MS, type Punto } from "@/lib/mapa"
import { crearClienteNavegador } from "@/lib/supabase/cliente-navegador"

// Con el mapa abierto la posición llega por Realtime; cada 60 s se vuelve a leer para descartar la vieja (R42)
const REVISAR_MS = 60_000
const CENTRO_INICIAL: Punto = { lat: 9.7457, lng: -63.1832 } // Maturín

/** Marcador sin imágenes (los íconos por defecto de Leaflet no viajan bien con el empaquetador) */
const icono = (L: typeof import("leaflet"), emoji: string, etiqueta: string) =>
  L.divIcon({
    className: "",
    html: `<div role="img" aria-label="${etiqueta}" style="font-size:34px;line-height:1;filter:drop-shadow(0 1px 2px rgb(0 0 0 / .45))">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 30],
  })

// Zoom de calle: se distinguen las cuadras y el nombre de las calles
const ZOOM_CALLE = 17

/** Desliza el marcador hasta la posición nueva (1 s) en vez de saltar */
function deslizar(marcador: Marker, destino: Punto) {
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
function Mapa({ carro, yo }: { carro: PosicionChofer; yo: Punto | null }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const marcadores = useRef<{ L: typeof import("leaflet"); carro?: Marker; yo?: Marker } | null>(null)
  const [listo, setListo] = useState(false)
  const encuadrado = useRef(false) // ya se hizo el encuadre inicial con el carro
  const automatico = useRef(false) // el movimiento lo hace el código, no la persona
  const siguiendoRef = useRef(true)
  const [siguiendo, setSiguiendo] = useState(true)

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
    else mk.carro = L.marker(carro, { icon: icono(L, "🚐", "El carro"), zIndexOffset: 1000 }).addTo(m)

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
  }, [carro, yo, listo])

  const seguirAlCarro = () => {
    const m = mapa.current
    if (!m || !carro) return
    siguiendoRef.current = true
    setSiguiendo(true)
    mover(() => m.setView(carro, Math.max(m.getZoom(), ZOOM_CALLE - 1)))
  }

  return (
    <div className="relative">
      <div ref={contenedor} className="h-[55svh] w-full overflow-hidden rounded-2xl border-2 bg-muted" />
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
 * "Ver en el mapa" (R41): por dónde viene el carro y, si compartió GPS, dónde está el pasajero y a qué distancia.
 * Solo mientras la hoja está abierta: lee la posición y después la recibe por Realtime cada vez que el chofer la envía.
 */
export function VerEnMapa({ choferId, chofer, yo }: { choferId: string; chofer: string; yo: Punto | null }) {
  const [abierta, setAbierta] = useState(false)
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

  const nombre = chofer.split(" ")[0]
  const distancia = carro && yo ? distanciaTexto(distanciaMetros(carro, yo)) : null

  return (
    <Sheet open={abierta} onOpenChange={(v) => (setAbierta(v), !v && setCarro(undefined))}>
      <SheetTrigger render={<Button variant="outline" className="w-full" />}>
        <MapIcon aria-hidden />
        Ver en el mapa
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-2xl">
        <SheetHeader>
          <SheetTitle>Por dónde viene {nombre}</SheetTitle>
          <SheetDescription className="text-base" aria-live="polite">
            {carro === undefined
              ? "Buscando el carro…"
              : carro === null
                ? `${nombre} no está compartiendo su ubicación ahora.`
                : distancia
                  ? `El carro está a ${distancia} de ti · actualizado ${hace(carro.actualizadaEn)}.`
                  : `Actualizado ${hace(carro.actualizadaEn)}. Comparte tu GPS al avisar que esperas para ver a qué distancia está.`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-5 pb-6">
          {carro === undefined && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2Icon aria-hidden className="size-5 animate-spin" /> Cargando…
            </p>
          )}
          {abierta && <Mapa carro={carro ?? null} yo={yo} />}
          <p className="text-sm text-muted-foreground">🚐 el carro{yo ? " · 📍 tú" : ""}. Se mueve solo cuando el chofer envía su ubicación.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
