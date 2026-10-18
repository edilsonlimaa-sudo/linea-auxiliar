import * as React from "react"

const MOBILE_BREAKPOINT = 768
const CONSULTA = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function suscribirse(avisar: () => void) {
  const mql = window.matchMedia(CONSULTA)
  mql.addEventListener("change", avisar)
  return () => mql.removeEventListener("change", avisar)
}

// Celular o pantalla grande, sin setState en un efecto (useSyncExternalStore). En el servidor: escritorio.
export function useIsMobile() {
  return React.useSyncExternalStore(
    suscribirse,
    () => window.matchMedia(CONSULTA).matches,
    () => false
  )
}
