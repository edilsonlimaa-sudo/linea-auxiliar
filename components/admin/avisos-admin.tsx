"use client"

import { BellOffIcon, BellRingIcon, Loader2Icon, SmartphoneIcon } from "lucide-react"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { activarAvisos, type EstadoAvisos, revisarAvisos } from "@/lib/avisos-celular"
import { cn } from "@/lib/utils"

const TEXTOS: Record<"inactivo" | "activo" | "bloqueado" | "iphone", { titulo: string; texto: string }> = {
  inactivo: {
    titulo: "Avisarme de cada cuenta nueva",
    texto: "Recibe un aviso en este aparato cuando alguien se registra, aunque el panel esté cerrado.",
  },
  activo: {
    titulo: "Este aparato te avisa de cada cuenta nueva",
    texto: "Al tocar el aviso se abre esta pantalla. Cada aparato se activa aparte; al salir del panel, deja de avisar.",
  },
  bloqueado: {
    titulo: "Los avisos están bloqueados en este aparato",
    texto: "Para activarlos, abre los ajustes del navegador, busca Notificaciones y permite esta página.",
  },
  iphone: {
    titulo: "Para recibir avisos en el iPhone",
    texto: "Primero agrega la app a tu pantalla de inicio (Compartir → Agregar a inicio) y abre el panel desde ese ícono.",
  },
}

/**
 * Aviso al admin de cada cuenta nueva (R93), arriba de Por aprobar: el permiso se pide solo al tocar "Activar"
 * (como R90). Activado, lo dice; si el aparato no puede recibir avisos, no se ve.
 */
export function AvisosAdmin() {
  const [estado, setEstado] = useState<EstadoAvisos>("cargando")
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()

  useEffect(() => {
    let vigente = true
    revisarAvisos()
      .then((e) => vigente && setEstado(e))
      .catch(() => vigente && setEstado("sin-soporte"))
    return () => {
      vigente = false
    }
  }, [])

  if (estado === "cargando" || estado === "sin-soporte") return null
  const t = TEXTOS[estado]
  const Icono = estado === "bloqueado" ? BellOffIcon : estado === "iphone" ? SmartphoneIcon : BellRingIcon

  return (
    <section
      aria-labelledby="titulo-avisos"
      className={cn("flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3", estado === "activo" && "border-success/50 bg-success-muted")}
    >
      <Icono aria-hidden className={cn("size-5 shrink-0", estado === "activo" ? "text-success" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <h2 id="titulo-avisos" className="font-bold">
          {t.titulo}
        </h2>
        <p className="text-sm text-muted-foreground">{t.texto}</p>
      </div>
      {estado === "inactivo" && (
        <Button
          variant="outline"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const r = await activarAvisos()
              setEstado(r.estado)
              setError(r.error)
            })
          }
        >
          {pendiente ? <Loader2Icon aria-hidden className="animate-spin" /> : null}
          Activar
        </Button>
      )}
      {error && (
        <p role="alert" className="w-full font-bold text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
