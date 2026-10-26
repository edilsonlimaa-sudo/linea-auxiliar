"use client"

import { CheckIcon, XIcon } from "lucide-react"
import { useId, useState, useTransition } from "react"

import { Confirmar } from "@/components/confirmar"
import { Avatar } from "@/components/foto/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { decidirPagoCuota } from "@/lib/acciones/cuota"
import { bolivares, nombreBanco } from "@/lib/bancos"
import type { AvisoAdmin, EstadoAviso } from "@/lib/datos/cuota"
import { hora } from "@/lib/fechas"
import { cn } from "@/lib/utils"

const ESTADO: Record<EstadoAviso, { texto: string; clase: string }> = {
  revision: { texto: "En revisión", clase: "bg-warning-muted text-warning" },
  aprobado: { texto: "Aprobado", clase: "bg-success-muted text-success" },
  rechazado: { texto: "Rechazado", clase: "bg-destructive/10 text-destructive" },
}

/** Los avisos de pago de un día (R78): en revisión primero, con Aprobar / Rechazar; una decisión se puede cambiar */
export function AvisosCuota({ avisos }: { avisos: AvisoAdmin[] }) {
  if (avisos.length === 0) {
    return <p className="rounded-2xl border-2 border-dashed px-4 py-6 text-center text-muted-foreground">Nadie avisó un pago este día.</p>
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {avisos.map((a) => (
        <FilaAviso key={a.id} aviso={a} />
      ))}
    </ul>
  )
}

function FilaAviso({ aviso: a }: { aviso: AvisoAdmin }) {
  const [rechazar, setRechazar] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [error, setError] = useState<string>()
  const [pendiente, iniciar] = useTransition()
  const idMotivo = useId()

  const decidir = (aprobar: boolean) =>
    iniciar(async () => {
      const r = await decidirPagoCuota(a.id, aprobar, aprobar ? undefined : motivo)
      setError(r.error)
      if (!r.error) setRechazar(false)
    })

  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl border-2 bg-card p-4", a.estado === "revision" && "border-warning")}>
      <div className="flex items-center gap-3">
        <Avatar url={a.fotoUrl} nombre={a.chofer} className="size-10 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{a.chofer}</p>
          <p className="text-sm text-muted-foreground">
            Avisó a las {hora(a.creadoEn)}
            {a.estado === "revision" && (a.habilita ? " · ya puede publicar" : " · espera tu aprobación para publicar")}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold", ESTADO[a.estado].clase)}>{ESTADO[a.estado].texto}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-muted px-3 py-2">
        <dt className="text-sm text-muted-foreground">Referencia</dt>
        <dt className="text-sm text-muted-foreground">Monto</dt>
        <dd className="font-mono text-base font-bold break-all">{a.referencia}</dd>
        <dd className="font-bold">{bolivares(a.monto)}</dd>
        <dt className="col-span-2 mt-1 text-sm text-muted-foreground">Desde el banco</dt>
        <dd className="col-span-2 font-bold">{nombreBanco(a.banco)}</dd>
      </dl>
      {a.estado === "rechazado" && a.motivo && <p className="text-sm">Motivo: {a.motivo}</p>}
      {error && !rechazar && (
        <p role="alert" className="font-bold text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {a.estado !== "aprobado" && (
          <Button className="flex-1" variant={a.estado === "revision" ? "default" : "outline"} disabled={pendiente} onClick={() => decidir(true)}>
            <CheckIcon aria-hidden />
            {a.estado === "revision" ? "Aprobar" : "Aprobar igual"}
          </Button>
        )}
        {a.estado !== "rechazado" && (
          <Button
            className="flex-1"
            variant={a.estado === "revision" ? "destructive" : "outline"}
            disabled={pendiente}
            onClick={() => setRechazar(true)}
          >
            <XIcon aria-hidden />
            Rechazar
          </Button>
        )}
      </div>
      <Confirmar
        abierto={rechazar}
        onCambiar={setRechazar}
        titulo={`¿Rechazar el pago de ${a.chofer.split(" ")[0]}?`}
        descripcion={
          <span className="flex flex-col gap-3">
            <span>No podrá publicar más viajes hoy (lo ya publicado sigue). Si avisa otro pago, solo se libera cuando lo apruebes.</span>
            <span className="flex flex-col gap-1.5">
              <label htmlFor={idMotivo} className="font-bold text-foreground">
                Motivo (lo ve el chofer, opcional)
              </label>
              <Input id={idMotivo} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={140} placeholder="Ej. No aparece en el banco" />
            </span>
          </span>
        }
        confirmar="Sí, rechazar"
        cancelar="No, volver"
        ocupado={pendiente}
        error={error}
        onConfirmar={() => decidir(false)}
      />
    </li>
  )
}
