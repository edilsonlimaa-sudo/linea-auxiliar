"use client"

import { useEffect, useState } from "react"

// Errores de versión: la app quedó abierta con el código de un despliegue anterior y el servidor ya es otro (un archivo
// de la app que ya no existe, una acción con el id viejo). Recargar los arregla.
const DE_VERSION =
  /ChunkLoadError|Loading (CSS )?chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Failed to find Server Action|Server Action .* was not found/i

export function esErrorDeVersion(error: unknown) {
  if (!(error instanceof Error)) return false
  return error.name === "ChunkLoadError" || DE_VERSION.test(error.message)
}

const CLAVE = "recarga-por-version"
const ESPERA_MS = 60_000 // como mucho una recarga sola por minuto: si el error sigue, se muestra la pantalla

/**
 * Pantallas de error (error.tsx, global-error.tsx): si el error es de versión, recarga la app una vez, sola, sin que la
 * persona vea nada; si no (o si ya recargó hace poco), deja ver la pantalla con sus botones.
 */
export function useRecargarSiEsDeVersion(error: unknown) {
  const [recargando, setRecargando] = useState(false)
  useEffect(() => {
    console.error(error)
    if (!esErrorDeVersion(error)) return
    try {
      const ultima = Number(sessionStorage.getItem(CLAVE) ?? 0)
      if (Date.now() - ultima < ESPERA_MS) return
      sessionStorage.setItem(CLAVE, String(Date.now()))
    } catch {
      // Sin sessionStorage: se recarga igual (sin la guarda, a lo sumo vuelve a la pantalla de error)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- muestra "Actualizando la app…" mientras recarga
    setRecargando(true)
    window.location.reload()
  }, [error])
  return recargando
}
