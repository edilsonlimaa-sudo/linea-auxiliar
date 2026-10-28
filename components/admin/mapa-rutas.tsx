"use client"

import "leaflet/dist/leaflet.css"

import type { LayerGroup, Map as MapaLeaflet } from "leaflet"
import { useEffect, useRef, useState } from "react"

import { CENTRO_INICIAL } from "@/components/pasajero/ver-en-mapa"
import type { RutaViaje } from "@/lib/datos/rutas"
import { COLOR_SENTIDO } from "@/lib/mapa"

/**
 * Rutas (R92): cada viaje es una línea fina y transparente del color de su sentido: donde se repiten, la ruta
 * principal se ve fuerte. Tocar una dice de quién es, cuándo salió y cuánto
 * tardó. El mapa se encuadra en lo que hay.
 */
export function MapaRutas({ viajes }: { viajes: RutaViaje[] }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const capa = useRef<LayerGroup | null>(null)
  const L = useRef<typeof import("leaflet") | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    let cancelado = false
    void import("leaflet").then((leaflet) => {
      if (cancelado || !contenedor.current || mapa.current) return
      const m = leaflet.map(contenedor.current, { zoomControl: true })
      leaflet
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
        .addTo(m)
      m.setView(CENTRO_INICIAL, 13)
      mapa.current = m
      capa.current = leaflet.layerGroup().addTo(m)
      L.current = leaflet
      setListo(true)
    })
    return () => {
      cancelado = true
      mapa.current?.remove()
      mapa.current = null
    }
  }, [])

  useEffect(() => {
    const leaflet = L.current
    const m = mapa.current
    const grupo = capa.current
    if (!listo || !leaflet || !m || !grupo) return
    grupo.clearLayers()
    const todos: [number, number][] = []
    for (const v of viajes) {
      const linea = leaflet.polyline(v.puntos, { color: COLOR_SENTIDO[v.sentido], weight: 4, opacity: 0.35 })
      linea.bindPopup(`<strong>${v.chofer}</strong><br>${v.cuando}`)
      linea.on("mouseover", () => linea.setStyle({ opacity: 1, weight: 6 }))
      linea.on("mouseout", () => linea.setStyle({ opacity: 0.35, weight: 4 }))
      linea.addTo(grupo)
      todos.push(...v.puntos)
    }
    if (todos.length > 0) m.fitBounds(leaflet.latLngBounds(todos), { padding: [24, 24] })
  }, [listo, viajes])

  return <div ref={contenedor} className="h-[65vh] min-h-80 w-full overflow-hidden rounded-2xl border-2" />
}
