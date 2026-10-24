import type { Metadata } from "next"
import Link from "next/link"

import { ViajesEnCurso } from "@/components/admin/viajes-en-curso"
import { EnVivo } from "@/components/en-vivo"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { cargarCuentas, cargarPausasAbiertas, cargarViajesEnCurso } from "@/lib/datos/admin"
import { cargarListaGina } from "@/lib/datos/lista-gina"
import { inicioDelDia } from "@/lib/fechas"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Viajes en curso · Administración · Línea Auxiliar" }

// La hora de esta carga: los avisos ("pasó su hora hace 12 min") se calculan con ella; EnVivo vuelve a cargar
const instante = () => Date.now()

// Viajes en curso (§8): los viajes de la línea por sentido y momento. Se actualiza sola (EnVivo).
export default async function PaginaViajes() {
  await exigirAdmin()
  const [{ choferes, error }, { cuentas }, lista, pausas] = await Promise.all([
    cargarViajesEnCurso(),
    cargarCuentas(),
    cargarListaGina(),
    cargarPausasAbiertas(inicioDelDia(0)),
  ])
  // Conectados sin viaje abierto: también se pueden desconectar (R69)
  const conViaje = new Set(choferes.map((c) => c.id))
  const sinViaje = cuentas.filter((c) => c.rol === "chofer" && c.estado === "aprobado" && c.actividad?.conectado && !conViaje.has(c.id))
  const ahora = instante()
  const estrellas = new Map(
    cuentas.map((c) => [c.id, c.actividad?.estrellas != null && Number(c.actividad.calificaciones) > 0 ? Number(c.actividad.estrellas) : null])
  )

  return (
    <div className="flex flex-col gap-4">
      <EnVivo />
      <header className="flex flex-col gap-1">
        <h1 className="text-xl leading-tight font-bold">Viajes en curso</h1>
        <p className="text-muted-foreground">Cada viaje por sentido: lo que pasa ahora primero. Se actualiza sola.</p>
        <Link href="/admin/viajes/terminados" className="mt-1 w-fit font-bold text-primary underline underline-offset-4">
          Ver viajes terminados
        </Link>
      </header>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar los viajes: {error}</AlertTitle>
        </Alert>
      ) : (
        <ViajesEnCurso
          choferes={choferes}
          sinViaje={sinViaje}
          enPausa={pausas}
          enListaGina={lista.reduce((n, e) => n + e.personas, 0)}
          estrellas={estrellas}
          ahora={ahora}
        />
      )}
    </div>
  )
}
