import { ChevronLeftIcon, ChevronRightIcon, TriangleAlertIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AvisosCuota } from "@/components/admin/avisos-cuota"
import { DatosCuota } from "@/components/admin/datos-cuota"
import { EnVivo } from "@/components/en-vivo"
import { buttonVariants } from "@/components/ui/button"
import { bolivares } from "@/lib/bancos"
import { cargarCuotasAdmin } from "@/lib/datos/cuota"
import { diaDeHoy, fechaLarga } from "@/lib/fechas"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Cuotas · Administración" }

// Un día más o menos sobre "AAAA-MM-DD" (al mediodía, para no cruzar de día por la zona horaria)
const otroDia = (dia: string, dias: number) => new Date(new Date(`${dia}T12:00:00Z`).getTime() + dias * 86_400_000).toISOString().slice(0, 10)

// Cuotas (docs/especificacion.md §5.18, R78): los avisos de pago del día para conciliar, y los datos del cobro
export default async function PaginaCuotas({ searchParams }: PageProps<"/admin/cuotas">) {
  await exigirAdmin()
  const { dia: d } = await searchParams
  const hoy = diaDeHoy()
  const dia = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= hoy ? d : hoy
  const { config, avisos } = await cargarCuotasAdmin(dia)
  const aprobados = avisos.filter((a) => a.estado === "aprobado")
  const enRevision = avisos.filter((a) => a.estado === "revision").length
  const total = aprobados.reduce((s, a) => s + a.monto, 0)
  const enlace = (x: string) => (x === hoy ? "/admin/cuotas" : `/admin/cuotas?dia=${x}`)

  return (
    <div className="flex flex-col gap-6">
      <EnVivo />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Cuotas</h1>
        <p className="text-muted-foreground">Los choferes pagan por Pago Móvil para publicar viajes ese día. Concilia con tu banco y decide.</p>
      </div>

      {(!config?.activa || config.desde > hoy) && (
        <p className="flex gap-2 rounded-2xl border-2 border-warning/50 bg-warning-muted px-4 py-3">
          <TriangleAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
          {config?.activa
            ? `La cuota empieza el ${fechaLarga(`${config.desde}T12:00:00Z`)}: hasta entonces se publica sin pagar.`
            : "La cuota está apagada: los choferes publican sin pagar. Actívala abajo, en Datos del cobro."}
        </p>
      )}

      <nav aria-label="Día" className="flex items-center gap-2">
        <Link href={enlace(otroDia(dia, -1))} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Día anterior">
          <ChevronLeftIcon aria-hidden />
        </Link>
        <p className="min-w-0 flex-1 text-center font-bold">{dia === hoy ? "Hoy" : fechaLarga(`${dia}T12:00:00Z`)}</p>
        {dia < hoy ? (
          <Link href={enlace(otroDia(dia, 1))} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Día siguiente">
            <ChevronRightIcon aria-hidden />
          </Link>
        ) : (
          <span aria-hidden className="size-10" />
        )}
      </nav>

      <div className="grid grid-cols-3 gap-2">
        <Dato n={String(enRevision)} texto="en revisión" />
        <Dato n={String(aprobados.length)} texto="aprobados" />
        <Dato n={bolivares(total)} texto="cobrado" />
      </div>

      <AvisosCuota avisos={avisos} />

      <details open={!config?.activa} className="group rounded-2xl border-2 bg-card">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 py-2 font-bold focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          Datos del cobro
        </summary>
        <div className="px-4 pb-4">
          <DatosCuota config={config} />
        </div>
      </details>
    </div>
  )
}

function Dato({ n, texto }: { n: string; texto: string }) {
  return (
    <div className="rounded-2xl border-2 bg-card px-3 py-2">
      <p className="text-xl font-bold">{n}</p>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  )
}
