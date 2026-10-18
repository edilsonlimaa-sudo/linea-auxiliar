import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Para compilar (`next build`) sin pisar la carpeta del `next dev` que está corriendo: NEXT_DIST_DIR=.next-build
  distDir: process.env.NEXT_DIST_DIR || ".next",
}

export default nextConfig
