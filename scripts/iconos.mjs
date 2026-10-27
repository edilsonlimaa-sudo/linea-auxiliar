// Íconos de la app instalable (R90) a partir de app/icon.svg: node scripts/iconos.mjs (usa sharp, que viene con Next)
import { readFileSync } from "node:fs"
import sharp from "sharp"

const svg = readFileSync("app/icon.svg", "utf8")
// Maskable: el sistema recorta su propia forma; sin esquinas redondeadas y con el dibujo dentro de la zona segura (80 %)
const sinRedondear = svg.replace('rx="112"', 'rx="0"')
const maskable = sinRedondear.replace(/<svg([^>]*)viewBox="0 0 512 512">/, '<svg$1viewBox="-64 -64 640 640">')
  .replace("<defs>", '<rect x="-64" y="-64" width="640" height="640" fill="#0b3b66"/><defs>')
  .replace("</g>", '</g><rect x="-64" y="404" width="640" height="44" fill="#f5b400"/>')
// Insignia de la barra de estado (Android): solo la silueta del bus, blanca sobre transparente
const insignia = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect x="136" y="84" width="240" height="268" rx="44" fill="#fff"/>
  <rect x="160" y="346" width="48" height="56" rx="12" fill="#fff"/>
  <rect x="304" y="346" width="48" height="56" rx="12" fill="#fff"/>
</svg>`
const hacer = (fuente, tam, salida) => sharp(Buffer.from(fuente), { density: 384 }).resize(tam, tam).png().toFile(salida)
Promise.all([
  hacer(svg, 192, "public/icono-192.png"),
  hacer(svg, 512, "public/icono-512.png"),
  hacer(maskable, 512, "public/icono-maskable-512.png"),
  hacer(insignia, 96, "public/insignia-96.png"),
  hacer(sinRedondear, 180, "app/apple-icon.png"),
]).then(() => console.log("íconos listos"))
