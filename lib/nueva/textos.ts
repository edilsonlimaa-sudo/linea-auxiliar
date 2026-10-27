// Textos puros del chofer: fuera de los archivos "use client" para que también los use el servidor
export const personasTexto = (n: number) => (n === 1 ? "1 persona" : `${n} personas`)
export const puestosTexto = (n: number) => (n === 1 ? "1 puesto" : `${n} puestos`)
