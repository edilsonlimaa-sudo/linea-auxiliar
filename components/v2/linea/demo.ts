// Datos de ejemplo de la propuesta "La línea + Me voy" (v2): sin base, sin sesión.
// La línea une dos barrios, Valle Grande y el Centro (zonas: ahí se recoge o se deja a cada uno donde está). Gina es una
// parada, el terminal en el Centro: ahí termina Valle Grande → Centro y empieza Centro → Valle Grande, con su lista.
// En el diagrama tú vas arriba, tu destino abajo y los carros suben hacia ti. Posiciones de 0 (arriba) a 1 (abajo).

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
  barrios: { nombre: string; desde: number; hasta: number }[] // zonas en las puntas
  paradas: { nombre: string; pos: number; referencia?: boolean }[] // puntos: la parada Gina (referencia: un punto menor, si hiciera falta)
  tu: { pos: number; lugar: string } // dónde esperas
  llegada: number // pos del destino
  modelo: "apartar" | "lista" // al Centro se aparta; a Valle Grande, lista en Gina
  enLista: number // a Valle Grande: cuántos esperan antes que tú
  carros: CarroDemo[]
}

const pedro: ChoferDemo = { nombre: "Pedro J.", completo: "Pedro Julio Lira", estrellas: 4.8, placa: "MDB92L", unidad: "1", carro: "Mazda Allegro · Plateado", aire: true }
const oscarelys: ChoferDemo = { nombre: "Oscarelys D.", completo: "Oscarelys Daniela", estrellas: 5, placa: "MDR27Z", unidad: "3", carro: "Corolla · Dorado", aire: true }
const davied: ChoferDemo = { nombre: "Davied S.", completo: "Davied Sifontes", estrellas: 4.6, placa: "NAE37C", unidad: "2", carro: "Mitsubishi Lancer · Gris", aire: false }

// Al Centro: te recogen donde estás en Valle Grande (arriba); los carros suben a buscarte y te llevan hasta Gina
const alCentro: TramoDemo = {
  destino: "Centro",
  barrios: [
    { nombre: "Valle Grande", desde: 0.03, hasta: 0.3 },
    { nombre: "Centro", desde: 0.7, hasta: 0.97 },
  ],
  paradas: [
    { nombre: "Gina", pos: 0.93 },
  ],
  tu: { pos: 0.12, lugar: "Entrada de Las Cayenas" },
  llegada: 0.93,
  modelo: "apartar",
  enLista: 0,
  carros: [
    { id: "c1", chofer: pedro, pos: 0.26, minutos: 4, puestos: 4, libres: 2 },
    { id: "c2", chofer: oscarelys, pos: 0.6, minutos: 13, puestos: 4, libres: 4 },
    { id: "c3", chofer: davied, pos: 0.84, minutos: 24, puestos: 4, libres: 0 },
  ],
}

// A Valle Grande: esperas en la parada Gina, en el Centro (arriba); los carros llegan a Gina terminando su viaje al
// Centro, llaman en orden a los de la lista y te dejan donde vas en Valle Grande
const aValle: TramoDemo = {
  destino: "Valle Grande",
  barrios: [
    { nombre: "Centro", desde: 0.03, hasta: 0.3 },
    { nombre: "Valle Grande", desde: 0.7, hasta: 0.97 },
  ],
  paradas: [
    { nombre: "Gina", pos: 0.07 },
  ],
  tu: { pos: 0.07, lugar: "Gina" },
  llegada: 0.86,
  modelo: "lista",
  enLista: 4,
  carros: [
    { id: "v1", chofer: davied, pos: 0.4, minutos: 6, puestos: 4, libres: 4 },
    { id: "v2", chofer: pedro, pos: 0.8, minutos: 15, puestos: 4, libres: 4 },
  ],
}

export const TRAMOS: Record<Sentido, TramoDemo> = { centro: alCentro, valle: aValle }

export const SIN_CARROS = {
  vuelve: "Pedro J. vuelve como a las 6:30 p. m.",
}
