"use client"

import "leaflet/dist/leaflet.css"

import type { LayerGroup, Map as MapaLeaflet } from "leaflet"
import { useEffect, useRef, useState } from "react"

import { CENTRO_INICIAL } from "@/components/pasajero/ver-en-mapa"
import type { Tramo } from "@/lib/datos/rutas"
import { COLOR_FUERA_DE_VIAJE, COLOR_SENTIDO } from "@/lib/mapa"

const ESPACIO_FLECHAS = 90 // px en la pantalla entre una flechita y la siguiente

const colorDe = (t: Tramo) => (t.sentido ? COLOR_SENTIDO[t.sentido] : COLOR_FUERA_DE_VIAJE)

/**
 * Flechitas hacia donde iba el carro, cada ESPACIO_FLECHAS px a lo largo de cada tramo. Se calculan en píxeles del
 * zoom actual (por eso se rehacen al hacer zoom) y se dibujan como líneas en el canvas: miles no pesan.
 */
function dibujarFlechas(leaflet: typeof import("leaflet"), m: MapaLeaflet, grupo: LayerGroup, tramos: Tramo[]) {
  grupo.clearLayers()
  for (const t of tramos) {
    const color = colorDe(t)
    const pts = t.puntos.map((p) => m.latLngToLayerPoint(p))
    let falta = ESPACIO_FLECHAS / 2
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      const largo = a.distanceTo(b)
      const ux = (b.x - a.x) / largo
      const uy = (b.y - a.y) / largo
      while (falta <= largo) {
        const x = a.x + ux * falta
        const y = a.y + uy * falta
        const punta = leaflet.point(x + ux * 6, y + uy * 6)
        const izquierda = leaflet.point(x - ux * 5 - uy * 6, y - uy * 5 + ux * 6)
        const derecha = leaflet.point(x - ux * 5 + uy * 6, y - uy * 5 - ux * 6)
        leaflet
          .polyline([izquierda, punta, derecha].map((p) => m.layerPointToLatLng(p)), { color, weight: 3, opacity: 0.95, interactive: false })
          .addTo(grupo)
        falta += ESPACIO_FLECHAS
      }
      falta -= largo
    }
  }
}

/**
 * Rutas (R92): cada tramo es una línea; los de un viaje, del color de su sentido (donde se repiten, la ruta principal
 * se ve fuerte), y los de fuera de un viaje, grises y punteados. Cada punto grabado es un puntito y las flechitas dicen
 * hacia dónde iba. Tocar una línea dice de quién es, cuándo fue y cuánto duró. El mapa se encuadra en lo que hay.
 */
export function MapaRutas({ tramos }: { tramos: Tramo[] }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const capa = useRef<LayerGroup | null>(null)
  const flechas = useRef<LayerGroup | null>(null)
  const actuales = useRef<Tramo[]>([])
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
      const grupoFlechas = leaflet.layerGroup().addTo(m)
      flechas.current = grupoFlechas
      m.on("zoomend", () => dibujarFlechas(leaflet, m, grupoFlechas, actuales.current))
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
      const color = colorDe(t)
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
    // Si el encuadre no cambia el zoom no hay zoomend: se dibujan igual
    actuales.current = orden
    if (flechas.current) dibujarFlechas(leaflet, m, flechas.current, orden)
  }, [listo, tramos])

  return <div ref={contenedor} className="h-[65vh] min-h-80 w-full overflow-hidden rounded-2xl border-2" />
}
