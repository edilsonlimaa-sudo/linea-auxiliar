import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Para compilar (`next build`) sin pisar la carpeta del `next dev` que está corriendo: NEXT_DIST_DIR=.next-build
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Dos layouts raíz (interfaz clásica y nueva, §5.21): la 404 de lo que no existe va en app/global-not-found.tsx
    globalNotFound: true,
  },
}

export default nextConfig
