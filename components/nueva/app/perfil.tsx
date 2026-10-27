"use client"

import * as React from "react"

export type PerfilVista = { nombre: string; iniciales: string; urbanismo: string | null; fotoUrl: string | null }

const Contexto = React.createContext<PerfilVista | null>(null)

/**
 * El perfil de quien usa la app, cargado una vez en el layout de las pestañas (que no se vuelve a pedir al cambiar
 * de pestaña). Así el Menú no tiene datos propios: es fijo, se deja listo antes del toque y abre al momento.
 */
export function PerfilProvider({ perfil, children }: { perfil: PerfilVista; children: React.ReactNode }) {
  return <Contexto value={perfil}>{children}</Contexto>
}

export function usePerfil(): PerfilVista {
  const perfil = React.use(Contexto)
  if (!perfil) throw new Error("usePerfil fuera de PerfilProvider")
  return perfil
}
