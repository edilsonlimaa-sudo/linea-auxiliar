// Rutas nuevas que se están midiendo antes de abrir (§5.24, R96). La base solo acepta las de `ruta` en
// interesados (check): agregar una ruta aquí exige también una migración.

export const RUTAS_NUEVAS = {
  faro: {
    id: "faro",
    lugar: "El Faro",
    destino: "Centro",
    detalle: "8 microcondominios en la Zona Industrial",
    ejemploSector: "Ej.: Faro 3, torre B",
  },
} as const

export type RutaNueva = keyof typeof RUTAS_NUEVAS

export const HORARIOS = [
  { id: "temprano", nombre: "Temprano", detalle: "5–8 a. m." },
  { id: "manana", nombre: "Mañana", detalle: "8 a. m.–12 m." },
  { id: "tarde", nombre: "Tarde", detalle: "12 m.–6 p. m." },
  { id: "noche", nombre: "Noche", detalle: "6–10 p. m." },
] as const

export const FRECUENCIAS = [
  { id: "1-2", nombre: "1 o 2 días" },
  { id: "3-4", nombre: "3 o 4 días" },
  { id: "casi_todos", nombre: "Casi todos" },
] as const

export type HorarioId = (typeof HORARIOS)[number]["id"]
export type FrecuenciaId = (typeof FRECUENCIAS)[number]["id"]
