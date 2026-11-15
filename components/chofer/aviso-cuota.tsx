"use client"

import { CheckCircle2Icon, ChevronRightIcon, HandHeartIcon, HourglassIcon, InfoIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { useAporteHoyNo, marcarAporteHoyNo } from "@/components/chofer/aporte-hoy-no"
import { Button, buttonVariants } from "@/components/ui/button"
import { bolivares } from "@/lib/bancos"
import type { CuotaChofer } from "@/lib/datos/cuota"

/**
 * El aporte del día en Inicio (R76–R77): voluntario, nunca bloquea. Ya aportó (o en revisión): una línea discreta de
 * gracias. Rechazado hoy: una línea discreta. Sin aporte: la invitación (solo con `invitar`, sin viajes abiertos),
 * con "Hoy no" hasta el día siguiente. El pago y el aviso de la referencia van en /cuota.
 */
export function AvisoCuota({ cuota, invitar = false }: { cuota: CuotaChofer; invitar?: boolean }) {
  const hoyNo = useAporteHoyNo()
  const ultimo = cuota.avisos[0] ?? null

  if (cuota.habilitado || ultimo?.estado === "revision") {
    const enRevision = !cuota.avisos.some((a) => a.estado === "aprobado")
    return (
      <Fila
        icono={enRevision ? <HourglassIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : <CheckCircle2Icon aria-hidden className="size-4 shrink-0 text-success" />}
        texto={enRevision ? "Tu aporte de hoy está en revisión · ¡gracias!" : "Gracias por tu aporte de hoy"}
      />
    )
  }

  if (ultimo?.estado === "rechazado") {
    return <Fila icono={<InfoIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />} texto="Tu aporte de hoy no apareció en el banco" />
  }

  if (!invitar || hoyNo) return null

  return (
    <section aria-labelledby="titulo-aporte" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex gap-3">
        <HandHeartIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex flex-col gap-1">
          <h2 id="titulo-aporte" className="text-base leading-tight font-bold">
            ¿Aportas hoy a la app?
          </h2>
          <p className="text-sm text-muted-foreground">
            Con {bolivares(cuota.monto)} nos ayudas a mantener la Línea en el aire. Es voluntario: trabajas igual.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href="/cuota" className={buttonVariants({ variant: "default", className: "flex-1" })}>
          Aportar
        </Link>
        <Button type="button" variant="ghost" onClick={marcarAporteHoyNo}>
          Hoy no
        </Button>
      </div>
    </section>
  )
}

function Fila({ icono, texto }: { icono: ReactNode; texto: string }) {
  return (
    <Link
      href="/cuota"
      className="flex min-h-10 items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      {icono}
      <span className="min-w-0 flex-1">{texto}</span>
      <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}
