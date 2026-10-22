// Datos de ejemplo de la propuesta "¿Hay carro hacia…?" (v2): sin base, sin sesión.
// El pasajero no tiene destino, tiene un SENTIDO: desde Valle Grande va hacia el Centro (y puede bajarse antes, en el
// camino); desde el Centro va hacia Valle Grande. Hay más gente que puestos y no siempre hay carro: lo que importa es
// saber si hay uno yendo hacia su lado ahora o pronto. Todo sale de lo que el chofer ya dice en la app (qué viaje hace,
// cuándo dijo que llega, qué publicó después): nada de GPS.

export type Sentido = "centro" | "valle"

export type ChoferDemo = {
  nombre: string // corto: "Pedro J."
  estrellas: number
  placa: string
  carro: string
}

// Lo que hace ahora y lo que hará después (su ida y vuelta)
export type TrabajoDemo = {
  chofer: ChoferDemo
  ahora: {
    sentido: Sentido
    estado: "recogiendo" | "en_camino" | "en_ruta" // recogiendo / va a recoger / ya salió (lleva gente)
    minutos: number // recogiendo o en camino: hasta pasar a recoger; en ruta: hasta llegar al otro lado
    puestos: number
    libres: number
  }
  despues: { sentido: Sentido; hora: string; publicado: boolean } | null // publicado: lo anunció; si no, se estima por su vuelta
}

export type EscenarioDemo = {
  id: string
  titulo: string
  trabajando: TrabajoDemo[]
  esperan: Record<Sentido, number> // personas que quieren ir hacia cada lado
  vuelven: string[] // choferes en pausa: "Pedro J. vuelve como a las 6:30 p. m."
}

const pedro: ChoferDemo = { nombre: "Pedro J.", estrellas: 4.8, placa: "MDB92L", carro: "Mazda Allegro" }
const oscarelys: ChoferDemo = { nombre: "Oscarelys D.", estrellas: 5, placa: "MDR27Z", carro: "Corolla dorado" }
const davied: ChoferDemo = { nombre: "Davied S.", estrellas: 4.6, placa: "NAE37C", carro: "Lancer gris" }

export const ESCENARIOS: EscenarioDemo[] = [
  {
    id: "ahora",
    titulo: "Hay carro",
    trabajando: [
      {
        chofer: pedro,
        ahora: { sentido: "centro", estado: "en_camino", minutos: 4, puestos: 4, libres: 2 },
        despues: { sentido: "valle", hora: "6:05 p. m.", publicado: true },
      },
      {
        chofer: oscarelys,
        ahora: { sentido: "valle", estado: "en_ruta", minutos: 12, puestos: 4, libres: 0 },
        despues: { sentido: "centro", hora: "6:10 p. m.", publicado: false },
      },
      {
        chofer: davied,
        ahora: { sentido: "centro", estado: "recogiendo", minutos: 0, puestos: 4, libres: 1 },
        despues: null,
      },
    ],
    esperan: { centro: 9, valle: 5 },
    vuelven: [],
  },
  {
    id: "pronto",
    titulo: "Viene pronto",
    trabajando: [
      {
        chofer: oscarelys,
        ahora: { sentido: "valle", estado: "en_ruta", minutos: 14, puestos: 4, libres: 0 },
        despues: { sentido: "centro", hora: "6:10 p. m.", publicado: false },
      },
      {
        chofer: pedro,
        ahora: { sentido: "valle", estado: "recogiendo", minutos: 0, puestos: 4, libres: 2 },
        despues: { sentido: "centro", hora: "6:40 p. m.", publicado: true },
      },
    ],
    esperan: { centro: 11, valle: 3 },
    vuelven: [],
  },
  {
    id: "nadie",
    titulo: "Sin servicio",
    trabajando: [],
    esperan: { centro: 6, valle: 2 },
    vuelven: ["Pedro J. vuelve como a las 6:30 p. m.", "Oscarelys D. terminó por hoy"],
  },
]
