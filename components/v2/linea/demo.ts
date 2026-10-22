// Datos de ejemplo de la propuesta "La línea + Me voy" (v2): sin base, sin sesión.
// La línea es un corredor: Valle Grande ↔ Gina ↔ Centro. Las posiciones van de 0 (arriba) a 1 (abajo) en el diagrama.

export type Sentido = "centro" | "valle"

export type ChoferDemo = {
  nombre: string // corto: "Pedro J."
  completo: string
  estrellas: number
  placa: string
  unidad: string
  carro: string
  aire: boolean
}

export type CarroDemo = {
  id: string
  chofer: ChoferDemo
  pos: number // dónde va en el diagrama (0 arriba, 1 abajo)
  minutos: number // hasta llegar a ti (0 = ya está)
  puestos: number
  libres: number
}

export type TramoDemo = {
  destino: string // "Centro"
  paradas: { nombre: string; pos: number }[] // de arriba abajo
  tu: { pos: number; lugar: string } // dónde esperas
  llegada: number // pos del destino
  modelo: "apartar" | "lista" // al Centro se aparta; a Valle Grande, lista en Gina
  enLista: number // a Valle Grande: cuántos esperan antes que tú
  carros: CarroDemo[]
}

const pedro: ChoferDemo = { nombre: "Pedro J.", completo: "Pedro Julio Lira", estrellas: 4.8, placa: "MDB92L", unidad: "1", carro: "Mazda Allegro · Plateado", aire: true }
const oscarelys: ChoferDemo = { nombre: "Oscarelys D.", completo: "Oscarelys Daniela", estrellas: 5, placa: "MDR27Z", unidad: "3", carro: "Corolla · Dorado", aire: true }
const davied: ChoferDemo = { nombre: "Davied S.", completo: "Davied Sifontes", estrellas: 4.6, placa: "NAE37C", unidad: "2", carro: "Mitsubishi Lancer · Gris", aire: false }

// Al Centro: esperas en Valle Grande (arriba); los carros suben desde el Centro a buscarte
const alCentro: TramoDemo = {
  destino: "Centro",
  paradas: [
    { nombre: "Valle Grande", pos: 0.08 },
    { nombre: "Gina", pos: 0.5 },
    { nombre: "Centro", pos: 0.92 },
  ],
  tu: { pos: 0.08, lugar: "Entrada de Las Cayenas" },
  llegada: 0.92,
  modelo: "apartar",
  enLista: 0,
  carros: [
    { id: "c1", chofer: pedro, pos: 0.26, minutos: 4, puestos: 4, libres: 2 },
    { id: "c2", chofer: oscarelys, pos: 0.62, minutos: 13, puestos: 4, libres: 4 },
    { id: "c3", chofer: davied, pos: 0.88, minutos: 24, puestos: 4, libres: 0 },
  ],
}

// A Valle Grande: esperas en Gina (en el medio); los carros bajan desde el Centro y llaman en orden
const aValle: TramoDemo = {
  destino: "Valle Grande",
  paradas: [
    { nombre: "Centro", pos: 0.08 },
    { nombre: "Gina", pos: 0.42 },
    { nombre: "Valle Grande", pos: 0.92 },
  ],
  tu: { pos: 0.42, lugar: "Gina" },
  llegada: 0.92,
  modelo: "lista",
  enLista: 4,
  carros: [
    { id: "v1", chofer: davied, pos: 0.24, minutos: 6, puestos: 4, libres: 4 },
    { id: "v2", chofer: pedro, pos: 0.1, minutos: 15, puestos: 4, libres: 4 },
  ],
}

export const TRAMOS: Record<Sentido, TramoDemo> = { centro: alCentro, valle: aValle }

export const SIN_CARROS = {
  vuelve: "Pedro J. vuelve como a las 6:30 p. m.",
}
