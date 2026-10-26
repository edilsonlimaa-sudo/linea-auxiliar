// Bancos de Venezuela con Pago Móvil (R74): código de 4 dígitos → nombre. El código es lo que se copia y pega en la
// app del banco. La base solo exige 4 dígitos; esta lista es la que ofrece el formulario.

export const BANCOS: Record<string, string> = {
  "0102": "Banco de Venezuela",
  "0104": "Venezolano de Crédito",
  "0105": "Mercantil",
  "0108": "Provincial",
  "0114": "Bancaribe",
  "0115": "Exterior",
  "0128": "Banco Caroní",
  "0134": "Banesco",
  "0137": "Sofitasa",
  "0138": "Banco Plaza",
  "0146": "Bangente",
  "0151": "BFC Banco Fondo Común",
  "0156": "100% Banco",
  "0157": "DelSur",
  "0163": "Banco del Tesoro",
  "0166": "Banco Agrícola de Venezuela",
  "0168": "Bancrecer",
  "0169": "R4 Banco Microfinanciero",
  "0171": "Banco Activo",
  "0172": "Bancamiga",
  "0173": "Banco Internacional de Desarrollo",
  "0174": "Banplus",
  "0175": "Banco Digital de los Trabajadores",
  "0177": "Banfanb",
  "0178": "N58 Banco Digital",
  "0191": "BNC Banco Nacional de Crédito",
}

/** "0102 · Banco de Venezuela" (para la lista y para mostrar) */
export const nombreBanco = (codigo: string) => (BANCOS[codigo] ? `${codigo} · ${BANCOS[codigo]}` : codigo)

/** 0414-1234567 / +584141234567 → 04141234567 (como lo piden las apps de los bancos), o null si no es un celular */
export function telefonoPagoMovil(texto: string): string | null {
  const d = texto.replace(/\D/g, "")
  const local = /^58\d{10}$/.test(d) ? `0${d.slice(2)}` : /^\d{10}$/.test(d) ? `0${d}` : d
  return /^04\d{9}$/.test(local) ? local : null
}

/** "V-12.345.678" / "12345678" → "V12345678", o null */
export function cedulaPagoMovil(texto: string): string | null {
  const limpio = texto.toUpperCase().replace(/[^VEJGP0-9]/g, "")
  const m = /^([VEJGP])?(\d{6,9})$/.exec(limpio)
  return m ? `${m[1] ?? "V"}${m[2]}` : null
}

/** Los tres datos, uno por línea: lo que copia "Copiar todo" */
export const textoPagoMovil = (p: { banco: string; telefono: string; cedula: string }) =>
  `${nombreBanco(p.banco)}\n${p.telefono}\n${p.cedula}`

export type DatosPagoMovil = { banco: string; telefono: string; cedula: string }

/**
 * Valida los tres datos del formulario (pmBanco, pmTelefono, pmCedula). En el registro es opcional: todo vacío → null
 * sin errores. Con algo escrito, los tres hacen falta.
 */
export function leerPagoMovil(
  form: { pmBanco?: unknown; pmTelefono?: unknown; pmCedula?: unknown },
  opcional: boolean
): { datos: DatosPagoMovil | null; errores: Record<string, string> } {
  const banco = String(form.pmBanco ?? "").trim()
  const tel = String(form.pmTelefono ?? "").trim()
  const ced = String(form.pmCedula ?? "").trim()
  if (opcional && !banco && !tel && !ced) return { datos: null, errores: {} }
  const errores: Record<string, string> = {}
  if (!BANCOS[banco]) errores.pmBanco = "Escoge tu banco"
  const telefono = telefonoPagoMovil(tel)
  if (!telefono) errores.pmTelefono = "Escribe el teléfono del Pago Móvil, por ejemplo 0414-1234567"
  const cedula = cedulaPagoMovil(ced)
  if (!cedula) errores.pmCedula = "Escribe la cédula, por ejemplo V-12345678"
  return Object.keys(errores).length || !telefono || !cedula ? { datos: null, errores } : { datos: { banco, telefono, cedula }, errores }
}

/** "Bs. 1.000" (la cuota del día, R76) */
export const bolivares = (monto: number) =>
  `Bs. ${new Intl.NumberFormat("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(monto)}`
