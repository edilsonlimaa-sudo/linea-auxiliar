import type { Metadata, Viewport } from "next"
import { DM_Sans, Geist_Mono, Outfit } from "next/font/google"

import "./globals.css"
import { AppShell } from "@/components/nueva/app/app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

// La interfaz nueva (docs/especificacion.md §5.21, R83–R85): su propio layout raíz, con su paleta y sus fuentes, para que
// nada de la clásica se mezcle. Pasar de una a otra recarga la página (cada cuenta vive en una sola).
const fontHeading = Outfit({ subsets: ["latin"], variable: "--font-heading" })
const fontSans = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Línea Auxiliar Valle Grande",
  description: "Transporte comunitario entre Valle Grande y el Centro de Maturín",
  applicationName: "Línea Auxiliar",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
}

export default function LayoutNueva({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es-VE"
      suppressHydrationWarning
      className={cn("antialiased", fontSans.variable, fontHeading.variable, fontMono.variable, "font-sans")}
    >
      <body>
        <ThemeProvider defaultTheme="light" enableSystem={false}>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
