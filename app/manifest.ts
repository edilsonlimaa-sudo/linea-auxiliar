import type { MetadataRoute } from "next"

// La app instalable (R90): en pantalla completa, con su nombre e íconos. En el iPhone es lo que permite los avisos en
// el celular (la Apple solo los manda a apps agregadas a la pantalla de inicio). Íconos: scripts/iconos.mjs
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Línea Auxiliar Valle Grande",
    short_name: "Línea Auxiliar",
    description: "Transporte comunitario entre Valle Grande y el Centro de Maturín",
    lang: "es-VE",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b3b66",
    theme_color: "#0b3b66",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
