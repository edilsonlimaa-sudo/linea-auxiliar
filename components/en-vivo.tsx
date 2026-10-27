"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { crearClienteNavegador } from "@/lib/supabase/cliente-navegador"

// Tablas que cambian lo que se ve en Inicio y Mi viaje. Las posiciones (cada 15 s) no: las escucha solo el mapa.
const TABLAS = ["viajes", "reservas", "esperas", "perfiles", "avisos", "lista_gina", "cuota_pagos", "notificacion_destinos"] as const

/**
 * Mantiene la pantalla al día (docs/especificacion.md §4 "Tiempo real"): el navegador se suscribe directo a
 * Supabase Realtime con la sesión de la persona (RLS decide qué cambios le llegan) y, cuando algo cambia, vuelve a
 * pedir los datos de la página al servidor (router.refresh conserva lo que está escribiendo).
 * Respaldo por si la conexión se corta sin aviso: cada 60 s y al volver a la app.
 */
export function EnVivo() {
  const router = useRouter()

  useEffect(() => {
    const supabase = crearClienteNavegador()
    let espera: ReturnType<typeof setTimeout> | undefined
    // Varios cambios juntos (p. ej. una reserva toca también su viaje) → un solo refresco
    const refrescar = () => {
      clearTimeout(espera)
      espera = setTimeout(() => router.refresh(), 300)
    }

    const canal = supabase.channel(`en-vivo:${crypto.randomUUID()}`)
    for (const tabla of TABLAS) {
      canal.on("postgres_changes", { event: "*", schema: "public", table: tabla }, refrescar)
    }
    let cancelado = false
    // Con la sesión de la persona, para que RLS filtre (sin token, Realtime no entrega nada)
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelado) return
      if (data.session) await supabase.realtime.setAuth(data.session.access_token)
      canal.subscribe((estado) => {
        // Al (re)conectar pudo haberse perdido algo mientras no había conexión
        if (estado === "SUBSCRIBED") refrescar()
      })
    })

    const respaldo = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh()
    }, 60_000)
    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar()
    }
    document.addEventListener("visibilitychange", alVolver)

    return () => {
      cancelado = true
      clearTimeout(espera)
      clearInterval(respaldo)
      document.removeEventListener("visibilitychange", alVolver)
      void supabase.removeChannel(canal)
    }
  }, [router])

  return null
}
