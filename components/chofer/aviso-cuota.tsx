import { CheckCircle2Icon, ChevronRightIcon, ClockIcon, HourglassIcon, WalletIcon, XCircleIcon } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { bolivares } from "@/lib/bancos"
import type { CuotaChofer } from "@/lib/datos/cuota"
import { cn } from "@/lib/utils"

/**
 * La cuota del día en Inicio (R76–R77): solo el aviso y el botón; el pago y el aviso de la referencia van en /cuota.
 * Habilitado, una línea discreta; sin habilitar, en lugar de Publicar.
 */
export function AvisoCuota({ cuota }: { cuota: CuotaChofer }) {
  const ultimo = cuota.avisos[0] ?? null

  if (cuota.habilitado) {
    const enRevision = ultimo?.estado === "revision"
    return (
      <Link
        href="/cuota"
        className={cn(
          "flex min-h-10 items-center gap-2 rounded-2xl px-4 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
          enRevision ? "bg-warning-muted text-foreground" : "bg-success-muted text-success"
        )}
      >
        {enRevision ? <HourglassIcon aria-hidden className="size-4 shrink-0 text-warning" /> : <CheckCircle2Icon aria-hidden className="size-4 shrink-0" />}
        <span className="min-w-0 flex-1">
          <strong>{enRevision ? "Cuota de hoy en revisión" : "Cuota de hoy pagada"}</strong>
          {enRevision && " · ya puedes publicar"}
        </span>
        <ChevronRightIcon aria-hidden className="size-4 shrink-0" />
      </Link>
    )
  }

  const { Icono, titulo, texto, boton, clase } =
    ultimo?.estado === "revision"
      ? {
          Icono: ClockIcon,
          titulo: "Esperando la aprobación de tu pago",
          texto: "Podrás publicar viajes cuando el administrador lo apruebe.",
          boton: "Ver mi pago",
          clase: "border-warning/50 bg-warning-muted",
        }
      : ultimo?.estado === "rechazado"
        ? {
            Icono: XCircleIcon,
            titulo: "Tu pago de hoy fue rechazado",
            texto: "No puedes publicar más viajes hoy. Mira por qué y, si fue un error, avisa otra vez.",
            boton: "Ver qué pasó",
            clase: "border-destructive/40 bg-destructive/10",
          }
        : {
            Icono: WalletIcon,
            titulo: "Para publicar hoy, paga la cuota del día",
            texto: `${bolivares(cuota.monto)} por Pago Móvil. Vale por todos tus viajes de hoy.`,
            boton: "Pagar la cuota",
            clase: "border-primary bg-card",
          }
  const pagar = !ultimo

  return (
    <section aria-labelledby="titulo-aviso-cuota" className={cn("flex flex-col gap-3 rounded-2xl border-2 p-4", clase)}>
      <div className="flex gap-3">
        <Icono aria-hidden className={cn("mt-0.5 size-5 shrink-0", pagar ? "text-primary" : ultimo.estado === "rechazado" ? "text-destructive" : "text-warning")} />
        <div className="flex flex-col gap-1">
          <h2 id="titulo-aviso-cuota" className="text-base leading-tight font-bold">
            {titulo}
          </h2>
          <p className="text-sm text-muted-foreground">{texto}</p>
        </div>
      </div>
      <Link href="/cuota" className={buttonVariants({ variant: pagar ? "signal" : "outline", size: pagar ? "lg" : "default", className: "w-full" })}>
        {boton}
      </Link>
    </section>
  )
}
