"use client"

import "leaflet/dist/leaflet.css"

import type { LayerGroup, Map as MapaLeaflet } from "leaflet"
import { useEffect, useRef, useState } from "react"

import { CENTRO_INICIAL } from "@/components/pasajero/ver-en-mapa"
import type { Tramo } from "@/lib/datos/rutas"
import { COLOR_FUERA_DE_VIAJE, COLOR_SENTIDO } from "@/lib/mapa"

/**
 * Rutas (R92): cada tramo es una línea; los de un viaje, del color de su sentido (donde se repiten, la ruta principal
 * se ve fuerte), y los de fuera de un viaje, grises y punteados. Cada punto grabado es un puntito. Tocar una línea dice
 * de quién es, cuándo fue y cuánto duró. El mapa se encuadra en lo que hay.
 */
export function MapaRutas({ tramos }: { tramos: Tramo[] }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const capa = useRef<LayerGroup | null>(null)
  const L = useRef<typeof import("leaflet") | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    let cancelado = false
    void import("leaflet").then((leaflet) => {
      if (cancelado || !contenedor.current || mapa.current) return
      // En canvas: con semanas de recorrido son miles de puntitos
      const m = leaflet.map(contenedor.current, { zoomControl: true, preferCanvas: true })
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
    // Primero lo de fuera de un viaje, para que los viajes queden encima
    const orden = [...tramos.filter((t) => !t.sentido), ...tramos.filter((t) => t.sentido)]
    for (const t of orden) {
      const color = t.sentido ? COLOR_SENTIDO[t.sentido] : COLOR_FUERA_DE_VIAJE
      const normal = t.sentido ? { weight: 4, opacity: 0.45 } : { weight: 3, opacity: 0.6 }
      for (const p of t.puntos) leaflet.circleMarker(p, { radius: 2, color, weight: 1, opacity: 0.7, interactive: false }).addTo(grupo)
      if (t.puntos.length > 1) {
        const linea = leaflet.polyline(t.puntos, { color, ...normal, dashArray: t.sentido ? undefined : "4 6" })
        linea.bindPopup(`<strong>${t.chofer}</strong><br>${t.cuando}`)
        linea.on("mouseover", () => linea.setStyle({ opacity: 1, weight: 6 }))
        linea.on("mouseout", () => linea.setStyle(normal))
        linea.addTo(grupo)
      }
      todos.push(...t.puntos)
    }
    if (todos.length > 0) m.fitBounds(leaflet.latLngBounds(todos), { padding: [24, 24] })
  }, [listo, tramos])

  return <div ref={contenedor} className="h-[65vh] min-h-80 w-full overflow-hidden rounded-2xl border-2" />
}
