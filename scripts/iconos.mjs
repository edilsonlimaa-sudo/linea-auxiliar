// Íconos de la app instalable (R90) a partir de app/icon.svg: node scripts/iconos.mjs (usa sharp, que viene con Next)
import { readFileSync } from "node:fs"
import sharp from "sharp"

const svg = readFileSync("app/icon.svg", "utf8")
const FONDO = /<rect width="512" height="512" rx="112" fill="([^"]+)"\/>/
const color = svg.match(FONDO)?.[1]
if (!color) throw new Error("app/icon.svg debe empezar con el fondo <rect width=512 height=512 rx=112>")

// Sin esquinas: el iPhone y los Android recortan su propia forma
const cuadrado = svg.replace(FONDO, `<rect width="512" height="512" fill="${color}"/>`)
// Maskable: fondo hasta el borde y el dibujo dentro de la zona segura (80 %)
const maskable = cuadrado
  .replace('viewBox="0 0 512 512"', 'viewBox="-64 -64 640 640"')
  .replace(`<rect width="512" height="512" fill="${color}"/>`, `<rect x="-64" y="-64" width="640" height="640" fill="${color}"/>`)
// Insignia de la barra de estado (Android): solo la forma, blanca sobre transparente
const insignia = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path d="M170 132 V300 Q170 352 222 352 H352" fill="none" stroke="#fff" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="170" cy="132" r="56" fill="#fff"/>
  <circle cx="362" cy="352" r="56" fill="#fff"/>
</svg>`

const hacer = (fuente, tam, salida) => sharp(Buffer.from(fuente), { density: 384 }).resize(tam, tam).png().toFile(salida)
await Promise.all([
  hacer(svg, 192, "public/icono-192.png"),
  hacer(svg, 512, "public/icono-512.png"),
  hacer(maskable, 512, "public/icono-maskable-512.png"),
  hacer(insignia, 96, "public/insignia-96.png"),
  hacer(cuadrado, 180, "app/apple-icon.png"),
])
console.log("íconos listos")
