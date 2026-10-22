// Búsqueda de Choferes y Pasajeros en el panel (docs/especificacion.md §8). Pura: corre en el celular sobre la lista
// que ya está en pantalla, así filtra al escribir.

// "José Ramírez" / "jose ramirez" / "JOSÉ": se busca sin tildes ni mayúsculas
export const normal = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

type Buscable = {
  rol: string
  nombre: string
  cedula: string | null
  telefono: string | null
  placa: string | null
  unidad: string | null
  urbanismo: string | null
}

/** ¿Coincide con lo escrito? Chofer: nombre, cédula, placa, unidad, teléfono. Pasajero: nombre, cédula, dónde vive, teléfono */
export function coincide(p: Buscable, busqueda: string): boolean {
  const q = normal(busqueda.trim())
  if (!q) return true
  const textos = p.rol === "chofer" ? [p.nombre, p.cedula, p.placa, p.unidad] : [p.nombre, p.cedula, p.urbanismo]
  if (textos.some((t) => normal(t).includes(q))) return true
  // El teléfono, por sus dígitos: "0414 123" encuentra +58 414 123…
  const digitos = busqueda.replace(/\D/g, "").replace(/^0/, "")
  return digitos.length >= 3 && (p.telefono ?? "").replace(/\D/g, "").includes(digitos)
}
