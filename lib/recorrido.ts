// Recorrido de los viajes (R92) en el teléfono del chofer: cada punto se guarda en IndexedDB (sobrevive a cerrar la app)
// hasta que se sube en un lote. Cada punto lleva de quién es: si en el teléfono entra otra cuenta, no se mezclan.

/** [epoch en segundos, lat, lng, precisión en m] */
export type PuntoRecorrido = [number, number, number, number | null]

const BASE = "linea-auxiliar-recorrido"
const TABLA = "puntos"

let abierta: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  abierta ??= new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open(BASE, 1)
    pedido.onupgradeneeded = () => {
      const tabla = pedido.result.createObjectStore(TABLA, { autoIncrement: true })
      tabla.createIndex("dueno", "dueno")
    }
    pedido.onsuccess = () => resolver(pedido.result)
    pedido.onerror = () => {
      abierta = null
      rechazar(pedido.error)
    }
  })
  return abierta
}

function hecho(tx: IDBTransaction): Promise<void> {
  return new Promise((resolver, rechazar) => {
    tx.oncomplete = () => resolver()
    tx.onerror = tx.onabort = () => rechazar(tx.error)
  })
}

/** Pide que el navegador no borre estos datos si le falta espacio (en Chrome no pregunta nada) */
export function pedirAlmacenamientoPersistente() {
  navigator.storage?.persist?.().catch(() => {})
}

export async function guardarPunto(dueno: string, punto: PuntoRecorrido): Promise<void> {
  const tx = (await abrir()).transaction(TABLA, "readwrite")
  tx.objectStore(TABLA).add({ dueno, punto })
  await hecho(tx)
}

/** Los puntos más viejos de esta cuenta que faltan por subir (con sus claves, para borrarlos al subirlos) */
export async function puntosPendientes(dueno: string, maximo: number): Promise<{ claves: IDBValidKey[]; puntos: PuntoRecorrido[] }> {
  const tx = (await abrir()).transaction(TABLA, "readonly")
  const claves: IDBValidKey[] = []
  const puntos: PuntoRecorrido[] = []
  await new Promise<void>((resolver, rechazar) => {
    const cursor = tx.objectStore(TABLA).index("dueno").openCursor(IDBKeyRange.only(dueno))
    cursor.onsuccess = () => {
      const c = cursor.result
      if (!c || puntos.length >= maximo) return resolver()
      claves.push(c.primaryKey)
      puntos.push((c.value as { punto: PuntoRecorrido }).punto)
      c.continue()
    }
    cursor.onerror = () => rechazar(cursor.error)
  })
  return { claves, puntos }
}

export async function borrarPuntos(claves: IDBValidKey[]): Promise<void> {
  if (claves.length === 0) return
  const tx = (await abrir()).transaction(TABLA, "readwrite")
  const tabla = tx.objectStore(TABLA)
  for (const clave of claves) tabla.delete(clave)
  await hecho(tx)
}
