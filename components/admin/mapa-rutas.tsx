"use client"

import "leaflet/dist/leaflet.css"

import type { CircleMarkerOptions, LayerGroup, Map as MapaLeaflet, Path } from "leaflet"
import { useEffect, useRef, useState } from "react"

import { CENTRO_INICIAL } from "@/components/pasajero/ver-en-mapa"
import type { Tramo } from "@/lib/datos/rutas"
import { COLOR_FUERA_DE_VIAJE, COLOR_SENTIDO } from "@/lib/mapa"

const ESPACIO_FLECHAS = 90 // px en la pantalla entre una flechita y la siguiente
const PUNTO: CircleMarkerOptions = { radius: 2, weight: 1, opacity: 0.7, fillOpacity: 0.2 }
const PUNTO_RESALTADO: CircleMarkerOptions = { radius: 4, weight: 2, opacity: 1, fillOpacity: 1 }

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
/**
 * `elegidos`: con uno, el mapa va a ese tramo y abre su popup; con varios (un viaje entero), los resalta todos juntos
 * y se encuadra en ellos, sin popup. `onElegir` avisa del tramo que se toca en el mapa (o null al cerrar su popup).
 */
export function MapaRutas({ tramos, elegidos, onElegir }: { tramos: Tramo[]; elegidos: string[]; onElegir: (id: string | null) => void }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const capa = useRef<LayerGroup | null>(null)
  const flechas = useRef<LayerGroup | null>(null)
  const actuales = useRef<Tramo[]>([])
  // La línea (o el puntito, si el tramo tiene uno solo) de cada tramo y cómo resaltarlo
  const capas = useRef(new Map<string, { objetivo: Path; resaltar: (si: boolean) => void }>())
  const abierto = useRef<string | null>(null) // el tramo con el popup abierto
  const enGrupo = useRef(new Set<string>()) // los tramos resaltados juntos (un viaje entero)
  const cerrando = useRef(false) // el mapa cierra el popup para mostrar un grupo: no es que lo cerró el admin
  const avisar = useRef(onElegir)
  const L = useRef<typeof import("leaflet") | null>(null)
  const [listo, setListo] = useState(false)

  useEffect(() => {
    avisar.current = onElegir
  }, [onElegir])

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
    // Rehacer las capas cierra el popup abierto: no es que el admin lo cerró (no se avisa)
    abierto.current = null
    grupo.clearLayers()
    capas.current.clear()
    enGrupo.current.clear()
    const todos: [number, number][] = []
    // Primero lo de fuera de un viaje, para que los viajes queden encima
    const orden = [...tramos.filter((t) => !t.sentido), ...tramos.filter((t) => t.sentido)]
    for (const t of orden) {
      const color = colorDe(t)
      const normal = t.sentido ? { weight: 4, opacity: 0.45 } : { weight: 3, opacity: 0.6 }
      const solo = t.puntos.length === 1
      const puntos = t.puntos.map((p) => leaflet.circleMarker(p, { color, ...PUNTO, interactive: solo }).addTo(grupo))
      const linea = solo ? null : leaflet.polyline(t.puntos, { color, ...normal, dashArray: t.sentido ? undefined : "4 6" }).addTo(grupo)
      const objetivo: Path = linea ?? puntos[0]
      objetivo.bindPopup(`<strong>${t.chofer}</strong><br>${t.cuando}`)
      // Pasar el mouse lo resalta; tocarlo (en el mapa o en la lista) lo deja resaltado mientras su popup está abierto
      const resaltar = (si: boolean) => {
        linea?.setStyle(si ? { opacity: 1, weight: 6 } : normal)
        for (const p of puntos) p.setStyle(si ? PUNTO_RESALTADO : PUNTO)
        if (si) {
          linea?.bringToFront()
          for (const p of puntos) p.bringToFront()
        }
      }
      objetivo.on("mouseover", () => resaltar(true))
      objetivo.on("mouseout", () => {
        if (abierto.current !== t.id && !enGrupo.current.has(t.id)) resaltar(false)
      })
      objetivo.on("popupopen", () => {
        abierto.current = t.id
        resaltar(true)
        avisar.current(t.id)
      })
      objetivo.on("popupclose", () => {
        if (!enGrupo.current.has(t.id)) resaltar(false)
        if (abierto.current !== t.id) return
        if (cerrando.current) {
          abierto.current = null
          return
        }
        abierto.current = null
        avisar.current(null)
      })
      capas.current.set(t.id, { objetivo, resaltar })
      todos.push(...t.puntos)
    }
    if (todos.length > 0) m.fitBounds(leaflet.latLngBounds(todos), { padding: [24, 24] })
    // Si el encuadre no cambia el zoom no hay zoomend: se dibujan igual
    actuales.current = orden
    if (flechas.current) dibujarFlechas(leaflet, m, flechas.current, orden)
  }, [listo, tramos])

  // Escogido en la lista: un tramo (el mapa va a él y abre su popup, que lo resalta) o un viaje entero
  useEffect(() => {
    const m = mapa.current
    const leaflet = L.current
    if (!listo || !m || !leaflet) return
    const grupo = elegidos.length > 1 ? new Set(elegidos) : new Set<string>()
    for (const id of enGrupo.current) if (!grupo.has(id) && id !== abierto.current) capas.current.get(id)?.resaltar(false)
    enGrupo.current = grupo

    if (elegidos.length === 0) {
      if (abierto.current) m.closePopup()
      return
    }
    const elegidosTramos = tramos.filter((t) => elegidos.includes(t.id))
    if (elegidosTramos.length === 0) return
    if (elegidos.length > 1) {
      if (abierto.current) {
        cerrando.current = true
        m.closePopup()
        cerrando.current = false
      }
      for (const id of grupo) capas.current.get(id)?.resaltar(true)
      m.fitBounds(leaflet.latLngBounds(elegidosTramos.flatMap((t) => t.puntos)), { padding: [48, 48], maxZoom: 16 })
      return
    }
    const [tramo] = elegidosTramos
    if (abierto.current === tramo.id) return
    m.fitBounds(leaflet.latLngBounds(tramo.puntos), { padding: [48, 48], maxZoom: 16 })
    capas.current.get(tramo.id)?.objetivo.openPopup(tramo.puntos[Math.floor(tramo.puntos.length / 2)])
  }, [listo, elegidos, tramos])

  return <div ref={contenedor} className="h-[65vh] min-h-80 w-full overflow-hidden rounded-2xl border-2" />
}
