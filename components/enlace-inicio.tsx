"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useRef } from "react"

const TOQUES = 5
const VENTANA_MS = 3000

/**
 * Logo de la barra de arriba (lleva a la portada). En la portada esconde la entrada del admin (§8):
 * 5 toques seguidos en menos de 3 s abren /admin/entrar.
 */
export function EnlaceInicio({ className, children }: { className?: string; children: React.ReactNode }) {
  const ruta = usePathname()
  const router = useRouter()
  const toques = useRef<number[]>([])

  return (
    <Link
      href="/"
      className={className}
      onClick={(e) => {
        if (ruta !== "/") return
        const ahora = Date.now()
        toques.current = [...toques.current.filter((t) => ahora - t < VENTANA_MS), ahora]
        if (toques.current.length >= TOQUES) {
          // Sin esto, el propio enlace a "/" se impone a la navegación
          e.preventDefault()
          toques.current = []
          router.push("/admin/entrar")
        }
      }}
    >
      {children}
    </Link>
  )
}
