"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { estadoRed, pedidosEnCurso } from "@/lib/nueva/red"
import { crearClienteNavegador } from "@/lib/supabase/cliente-navegador"

// Tablas que cambian lo que se ve en Inicio y Mi viaje. Las posiciones (cada 15 s) no: las escucha solo el mapa.
const MIN_ENTRE_MS = 3000
const LENTA_ENTRE_MS = 15_000
const REVISAR_MS = 2000

const TABLAS = ["viajes", "reservas", "esperas", "perfiles", "avisos", "lista_gina", "cuota_pagos", "notificacion_destinos"] as const

/**
 * Mantiene la pantalla al día (docs/especificacion.md §4 "Tiempo real"): el navegador se suscribe directo a
 * Supabase Realtime con la sesión de la persona (RLS decide qué cambios le llegan) y, cuando algo cambia, vuelve a
 * pedir los datos de la página al servidor (router.refresh conserva lo que está escribiendo).
 * Respaldo por si la conexión se corta sin aviso: cada 60 s y al volver a la app.
 *
 * Con mala señal (§5.21): Next hace las acciones y los refrescos de a uno, en fila, así que un refresco lento deja
 * esperando lo que la persona tocó (en Gina a la hora pico, "Anotarme" no salía nunca). Por eso: no refresca mientras
 * va un pedido a la app ni con la red caída (lo hace cuando vuelve), y como mucho cada MIN_ENTRE_MS (con la red lenta,
 * cada LENTA_ENTRE_MS). Sin la vigilancia de la red (la clásica) `estadoRed` dice que todo va bien.
 */
export function EnVivo() {
  const router = useRouter()

  useEffect(() => {
    const supabase = crearClienteNavegador()
    let espera: ReturnType<typeof setTimeout> | undefined
    let ultimo = 0
    const intentar = () => {
      const red = estadoRed()
      const falta = (red.lenta ? LENTA_ENTRE_MS : MIN_ENTRE_MS) - (Date.now() - ultimo)
      if (pedidosEnCurso() > 0 || red.caida || red.sinRed || falta > 0) {
        espera = setTimeout(intentar, Math.max(falta, REVISAR_MS))
        return
      }
      ultimo = Date.now()
      router.refresh()
    }
    // Varios cambios juntos (p. ej. una reserva toca también su viaje) → un solo refresco
    const refrescar = () => {
      clearTimeout(espera)
      espera = setTimeout(intentar, 300)
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
      if (document.visibilityState === "visible") refrescar()
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
