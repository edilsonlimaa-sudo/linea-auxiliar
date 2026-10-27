"use client"

import { Bell, Lightbulb, Megaphone, Sparkles } from "lucide-react"
import * as React from "react"

import { marcarNotificacionesLeidas } from "@/lib/acciones/notificaciones"
import type { TipoNotificacion } from "@/lib/notificaciones"
import type { NotificacionVista } from "@/lib/nueva/vistas"
import { cn } from "@/lib/utils"

const TIPOS: Record<TipoNotificacion, { nombre: string; icono: React.ComponentType<{ className?: string }> }> = {
  aviso: { nombre: "Aviso", icono: Megaphone },
  consejo: { nombre: "Consejo", icono: Lightbulb },
  novedad: { nombre: "Novedad", icono: Sparkles },
}

function IconoTipo({ tipo, className }: { tipo: TipoNotificacion; className?: string }) {
  const Icono = TIPOS[tipo].icono
  return (
    <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary", className)}>
      <Icono className="size-5" />
    </div>
  )
}

const GRUPOS = ["Hoy", "Esta semana", "Antes"] as const

/**
 * La pestaña Notificaciones (R89): agrupadas por tiempo, las no leídas destacadas. Al verla quedan leídas (la campana
 * se apaga), pero el destacado se queda mientras siga en la pantalla.
 */
export function ListaNotificaciones({ items }: { items: NotificacionVista[] }) {
  const sinLeer = items.filter((n) => !n.leida).map((n) => n.id)
  const clave = sinLeer.join(",")
  const [destacadas, setDestacadas] = React.useState(() => new Set(sinLeer))
  // Las que llegan con la pantalla abierta (EnVivo) también se destacan
  const nuevas = sinLeer.filter((id) => !destacadas.has(id))
  if (nuevas.length > 0) setDestacadas(new Set([...destacadas, ...nuevas]))

  React.useEffect(() => {
    if (clave) void marcarNotificacionesLeidas()
  }, [clave])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Bell className="size-7" />
        </div>
        <p className="font-heading text-lg font-semibold">Todavía no tienes notificaciones</p>
        <p className="text-sm text-muted-foreground">Aquí te avisamos de lo que pasa en la Línea.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {GRUPOS.map((grupo) => {
        const delGrupo = items.filter((n) => n.grupo === grupo)
        if (delGrupo.length === 0) return null
        return (
          <section key={grupo} className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-medium text-muted-foreground">{grupo}</h2>
            <ul className="divide-y overflow-hidden rounded-3xl border bg-card">
              {delGrupo.map((n) => {
                const nueva = destacadas.has(n.id)
                return (
                  <li key={n.id} className={cn("flex gap-3 p-4", nueva && "bg-primary/5")}>
                    <IconoTipo tipo={n.tipo} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        {TIPOS[n.tipo].nombre} · {n.cuando}
                        {nueva ? <span aria-label="Nueva" className="size-2 rounded-full bg-primary" /> : null}
                      </p>
                      <p className="font-heading font-semibold">{n.titulo}</p>
                      <p className="text-sm whitespace-pre-line text-muted-foreground">{n.texto}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
