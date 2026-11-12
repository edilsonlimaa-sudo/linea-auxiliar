// La salida fija (docs/especificacion.md §5.28, R108–R109): opciones de la encuesta, compartidas por la pantalla, la
// acción y el panel. La base acepta exactamente estos valores
export type Compromiso = "si" | "luego" | "no"
export type HorarioSalida = "17:15" | "17:45" | "otra"

export const HORARIOS_SALIDA: { id: HorarioSalida; nombre: string }[] = [
  { id: "17:15", nombre: "5:15 p. m." },
  { id: "17:45", nombre: "5:45 p. m." },
  { id: "otra", nombre: "Otra hora" },
]

export const DIAS_SALIDA: { id: number; corto: string; nombre: string }[] = [
  { id: 1, corto: "Lun", nombre: "Lunes" },
  { id: 2, corto: "Mar", nombre: "Martes" },
  { id: 3, corto: "Mié", nombre: "Miércoles" },
  { id: 4, corto: "Jue", nombre: "Jueves" },
  { id: 5, corto: "Vie", nombre: "Viernes" },
]

export const COMPROMISOS: { id: Compromiso; nombre: string; detalle: string }[] = [
  { id: "si", nombre: "Sí, pago la semana por adelantado", detalle: "Anótame para la prueba" },
  { id: "luego", nombre: "Me interesa, pero no ahora", detalle: "Avísame más adelante" },
  { id: "no", nombre: "No me sirve", detalle: "" },
]

export const MAX_HORA_OTRA = 40
export const MAX_COMENTARIO = 280

/** Con 4 que dicen que sí en un mismo horario se llena un carro (R109) */
export const PUESTOS_POR_CARRO = 4

export type RespuestaSalidaFija = {
  compromiso: Compromiso
  horario: HorarioSalida | null
  horarioOtro: string | null
  dias: number[]
  comentario: string | null
}

export const nombreHorario = (horario: string | null, otro: string | null) =>
  horario === "otra" ? (otro ?? "Otra hora") : (HORARIOS_SALIDA.find((h) => h.id === horario)?.nombre ?? "")

export const nombresDias = (dias: number[]) =>
  dias.length === 5 ? "Lunes a viernes" : dias.map((d) => DIAS_SALIDA.find((x) => x.id === d)?.corto ?? d).join(", ")
