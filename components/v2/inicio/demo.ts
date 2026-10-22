// Datos de ejemplo de la propuesta de Inicio de la v2: sin base, sin sesión. Cada escenario es un estado de la línea
// que el Inicio tiene que resolver bien.

export type Sentido = "centro" | "valle"

export type ChoferDemo = {
  nombre: string // corto: "Pedro J."
  completo: string
  estrellas: number
  calificaciones: number
  placa: string
  unidad: string
  carro: string // "Corolla · Gris"
  aire: boolean
}

export type EstadoCarro = "recogiendo" | "llegando" | "en_camino" | "proximo" | "en_ruta"

export type CarroDemo = {
  id: string
  chofer: ChoferDemo
  estado: EstadoCarro
  minutos: number // hasta que recoge (0 = recogiendo ahora)
  hora: string // "5:42 p. m."
  puestos: number
  libres: number
}

export type EscenarioDemo = {
  id: string
  titulo: string
  aviso: string | null
  trabajando: ChoferDemo[]
  vuelven: { nombre: string; texto: string }[]
  // Valle Grande → Centro: se aparta puesto en el carro que uno escoge
  alCentro: CarroDemo[]
  // Centro → Valle Grande: lista por orden de llegada en Gina
  aValle: { esperando: number; enGina: number; enCamino: number; carros: CarroDemo[] }
  miViaje: { titulo: string; detalle: string; chofer: ChoferDemo; minutos: number } | null
}

const pedro: ChoferDemo = {
  nombre: "Pedro J.",
  completo: "Pedro Julio Lira",
  estrellas: 4.8,
  calificaciones: 32,
  placa: "MDB92L",
  unidad: "1",
  carro: "Mazda Allegro · Plateado",
  aire: true,
}
const oscarelys: ChoferDemo = {
  nombre: "Oscarelys D.",
  completo: "Oscarelys Daniela",
  estrellas: 5,
  calificaciones: 16,
  placa: "MDR27Z",
  unidad: "3",
  carro: "Corolla · Dorado",
  aire: true,
}
const davied: ChoferDemo = {
  nombre: "Davied S.",
  completo: "Davied Sifontes",
  estrellas: 4.6,
  calificaciones: 9,
  placa: "NAE37C",
  unidad: "2",
  carro: "Mitsubishi Lancer · Gris",
  aire: false,
}

export const ESCENARIOS: EscenarioDemo[] = [
  {
    id: "normal",
    titulo: "Con carros",
    aviso: null,
    trabajando: [pedro, oscarelys, davied],
    vuelven: [],
    alCentro: [
      { id: "c1", chofer: pedro, estado: "llegando", minutos: 3, hora: "5:39 p. m.", puestos: 4, libres: 2 },
      { id: "c2", chofer: oscarelys, estado: "en_camino", minutos: 14, hora: "5:50 p. m.", puestos: 4, libres: 4 },
      { id: "c3", chofer: davied, estado: "proximo", minutos: 38, hora: "6:14 p. m.", puestos: 4, libres: 0 },
    ],
    aValle: {
      esperando: 6,
      enGina: 5,
      enCamino: 1,
      carros: [
        { id: "v1", chofer: davied, estado: "en_camino", minutos: 6, hora: "5:42 p. m.", puestos: 4, libres: 4 },
        { id: "v2", chofer: pedro, estado: "proximo", minutos: 31, hora: "6:07 p. m.", puestos: 4, libres: 4 },
      ],
    },
    miViaje: null,
  },
  {
    id: "aviso",
    titulo: "Con aviso",
    aviso: "Hoy la línea trabaja hasta las 8:00 p. m. por el juego en el estadio.",
    trabajando: [pedro, oscarelys],
    vuelven: [{ nombre: "Davied S.", texto: "vuelve como a las 6:30 p. m." }],
    alCentro: [{ id: "c1", chofer: oscarelys, estado: "recogiendo", minutos: 0, hora: "ahora", puestos: 4, libres: 1 }],
    aValle: {
      esperando: 2,
      enGina: 2,
      enCamino: 0,
      carros: [{ id: "v1", chofer: pedro, estado: "llegando", minutos: 2, hora: "5:38 p. m.", puestos: 4, libres: 3 }],
    },
    miViaje: null,
  },
  {
    id: "vacio",
    titulo: "Sin carros",
    aviso: null,
    trabajando: [],
    vuelven: [
      { nombre: "Pedro J.", texto: "vuelve como a las 6:30 p. m." },
      { nombre: "Oscarelys D.", texto: "terminó por hoy" },
    ],
    alCentro: [],
    aValle: { esperando: 3, enGina: 3, enCamino: 0, carros: [] },
    miViaje: null,
  },
  {
    id: "viaje",
    titulo: "En un viaje",
    aviso: null,
    trabajando: [pedro, oscarelys, davied],
    vuelven: [],
    alCentro: [
      { id: "c1", chofer: pedro, estado: "llegando", minutos: 3, hora: "5:39 p. m.", puestos: 4, libres: 1 },
      { id: "c2", chofer: oscarelys, estado: "en_camino", minutos: 14, hora: "5:50 p. m.", puestos: 4, libres: 4 },
    ],
    aValle: { esperando: 4, enGina: 4, enCamino: 0, carros: [] },
    miViaje: { titulo: "Tienes el puesto 3 de 4", detalle: "Te recoge en la entrada de Las Cayenas", chofer: pedro, minutos: 3 },
  },
]
