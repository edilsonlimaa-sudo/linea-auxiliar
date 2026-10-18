// Teléfonos venezolanos. Debe coincidir con las funciones SQL normalizar_telefono y correo_de_telefono.

/** 0414-1234567 → +584141234567 */
export function normalizarTelefono(telefono: string): string {
  const d = telefono.replace(/\D/g, "")
  if (/^0\d{10}$/.test(d)) return `+58${d.slice(1)}`
  if (/^58\d{10}$/.test(d)) return `+${d}`
  if (/^\d{10}$/.test(d)) return `+58${d}`
  return `+${d}`
}

/** Celular venezolano válido: +58 4XX XXXXXXX */
export function telefonoValido(telefono: string): boolean {
  return /^\+584\d{9}$/.test(normalizarTelefono(telefono))
}

/** Correo interno con el que se entra (nunca se muestra): 584141234567@tel.lineaauxiliar.app */
export function correoDeTelefono(telefono: string): string {
  return `${normalizarTelefono(telefono).slice(1)}@tel.lineaauxiliar.app`
}

/** +584141234567 → 0414-1234567 */
export function formatearTelefono(e164: string): string {
  const d = e164.replace(/\D/g, "")
  if (/^58\d{10}$/.test(d)) return `0${d.slice(2, 5)}-${d.slice(5)}`
  return e164
}
