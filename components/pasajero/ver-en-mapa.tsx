"use client"

import "leaflet/dist/leaflet.css"

import type { Map as MapaLeaflet, Marker } from "leaflet"
import { Loader2Icon, MapIcon } from "lucide-react"
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

function Mapa({ carro, yo }: { carro: PosicionChofer; yo: Punto | null }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const marcadores = useRef<{ L: typeof import("leaflet"); carro?: Marker; yo?: Marker } | null>(null)
  const [listo, setListo] = useState(false)

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
    }
  }, [])

  // Mover los marcadores cuando llega una posición nueva
  useEffect(() => {
    const m = mapa.current
    const mk = marcadores.current
    if (!listo || !m || !mk) return
    const { L } = mk
    const puntos: Punto[] = []
    if (carro) {
      mk.carro ??= L.marker(carro, { icon: icono(L, "🚐", "El carro") }).addTo(m)
      mk.carro.setLatLng(carro)
      puntos.push(carro)
    }
    if (yo) {
      mk.yo ??= L.marker(yo, { icon: icono(L, "📍", "Tú") }).addTo(m)
      puntos.push(yo)
    }
    if (puntos.length === 2) m.fitBounds(L.latLngBounds(puntos), { padding: [48, 48], maxZoom: 16 })
    else if (puntos.length === 1) m.setView(puntos[0], 15)
  }, [carro, yo, listo])

  return <div ref={contenedor} className="h-[55svh] w-full overflow-hidden rounded-2xl border-2 bg-muted" />
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
