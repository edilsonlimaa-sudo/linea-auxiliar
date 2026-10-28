"use client"

import { KeyRoundIcon, MessageCircleIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { Button, buttonVariants } from "@/components/ui/button"
import { restablecerPin } from "@/lib/acciones/admin"

/**
 * PIN olvidado (R4): genera un PIN temporal, lo muestra una sola vez para mandarlo por WhatsApp y, al entrar con él, la
 * persona escoge el suyo. Si se recarga la página, el PIN ya no se ve (no se guarda): se restablece otra vez.
 */
export function RestablecerPin({ id, nombre, telefono }: { id: string; nombre: string; telefono: string | null }) {
  const [abierto, setAbierto] = useState(false)
  const [pin, setPin] = useState<string>()
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()
  const primero = nombre.split(" ")[0]
  const digitos = telefono?.replace(/\D/g, "")
  const mensaje = pin
    ? `Hola ${primero}, tu PIN temporal de la app Línea Auxiliar es ${pin}. Entra con tu número y ese PIN: la app te pedirá escoger uno nuevo.`
    : ""

  return (
    <section aria-labelledby="titulo-pin" className="flex flex-col gap-3 rounded-2xl border-2 bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <KeyRoundIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h2 id="titulo-pin" className="font-bold">
            PIN
          </h2>
          <p className="text-sm text-muted-foreground">Si olvidó su PIN, genera uno temporal: al entrar, escoge el suyo.</p>
        </div>
        <Button variant="outline" onClick={() => (setError(undefined), setAbierto(true))}>
          Restablecer PIN
        </Button>
      </div>

      {pin && (
        <div role="status" className="flex flex-col gap-3 rounded-xl border-2 border-warning bg-warning-muted p-3">
          <p className="text-sm">
            PIN temporal de {primero}. <strong>Solo se ve ahora:</strong> mándaselo ya.
          </p>
          <p className="text-center font-mono text-3xl font-bold tracking-[0.3em]">{pin}</p>
          {digitos ? (
            <a
              href={`https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "whatsapp", className: "w-full" })}
            >
              <MessageCircleIcon aria-hidden /> Mandar por WhatsApp
            </a>
          ) : null}
        </div>
      )}

      <Confirmar
        abierto={abierto}
        onCambiar={setAbierto}
        titulo={`¿Restablecer el PIN de ${primero}?`}
        descripcion="Su PIN de ahora deja de servir y se cierra su sesión en el celular. Le mandas el temporal y, al entrar, escoge uno nuevo."
        confirmar="Sí, generar PIN temporal"
        cancelar="No, dejarlo así"
        variante="signal"
        ocupado={pendiente}
        error={error}
        onConfirmar={() =>
          iniciar(async () => {
            const r = await restablecerPin(id)
            if (r.error) return setError(r.error)
            setPin(r.pin)
            setAbierto(false)
          })
        }
      />
    </section>
  )
}
