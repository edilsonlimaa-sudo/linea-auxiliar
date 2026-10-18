import type { Metadata } from "next"
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

// Atkinson Hyperlegible: diseñada para baja visión (distingue l, I y 1). Mono para las placas.
// Next no tiene métricas de estas fuentes para generar el respaldo automático: se declara uno a mano.
const fontSans = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  adjustFontFallback: false,
  fallback: ["system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
})

const fontMono = Atkinson_Hyperlegible_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "Consolas", "monospace"],
})

export const metadata: Metadata = {
  title: "Línea Auxiliar Valle Grande",
  description: "Transporte comunitario entre Valle Grande y el Centro de Maturín",
  applicationName: "Línea Auxiliar",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es-VE"
      suppressHydrationWarning
      className={cn("antialiased", fontSans.variable, fontMono.variable, "font-sans")}
    >
      <body>
        {/* Claro por defecto; el modo oscuro solo se activa a mano (docs/especificacion.md §4) */}
        <ThemeProvider defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
