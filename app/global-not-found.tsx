import type { Metadata } from "next"
import { Atkinson_Hyperlegible_Next } from "next/font/google"

import "./(clasica)/globals.css"

// Con dos interfaces (§5.21) hay dos layouts raíz: una dirección que no existe no cae en ninguno, así que la página
// "no encontrada" se arma aquí sola, con los estilos de la clásica
const fontSans = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  adjustFontFallback: false,
  fallback: ["system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
})

export const metadata: Metadata = { title: "No encontrada · Línea Auxiliar" }

export default function GlobalNotFound() {
  return (
    <html lang="es-VE" className={`antialiased ${fontSans.variable} font-sans`}>
      <body>
        <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-bold">Esta página no existe</h1>
          <p className="text-muted-foreground">Puede que el enlace esté viejo.</p>
          <a href="/inicio" className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground">
            Ir al inicio
          </a>
        </main>
      </body>
    </html>
  )
}
