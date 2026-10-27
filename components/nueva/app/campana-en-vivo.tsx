"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { crearClienteNavegador } from "@/lib/supabase/cliente-navegador"

/**
 * El número de la campana al día en todas las pestañas (R89). Vive en el layout de las pestañas y escucha solo las
 * notificaciones de esta persona (no todo lo que escucha EnVivo): cuando llega o se lee una, pide la página de nuevo
 * y el layout trae el número. También al volver a la app.
 */
export function CampanaEnVivo({ personaId }: { personaId: string }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = crearClienteNavegador()
    let espera: ReturnType<typeof setTimeout> | undefined
    const refrescar = () => {
      clearTimeout(espera)
      espera = setTimeout(() => router.refresh(), 300)
    }

    const canal = supabase
      .channel(`campana:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notificacion_destinos", filter: `persona_id=eq.${personaId}` }, refrescar)
    let cancelado = false
    // Con la sesión de la persona, para que RLS deje pasar sus filas
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelado) return
      if (data.session) await supabase.realtime.setAuth(data.session.access_token)
      canal.subscribe()
    })
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar()
    }
    document.addEventListener("visibilitychange", alVolver)

    return () => {
      cancelado = true
      clearTimeout(espera)
      document.removeEventListener("visibilitychange", alVolver)
      void supabase.removeChannel(canal)
    }
  }, [router, personaId])

  return null
}
