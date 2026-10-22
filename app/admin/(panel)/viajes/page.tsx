import type { Metadata } from "next"
import Link from "next/link"

import { ViajesEnCurso } from "@/components/admin/viajes-en-curso"
import { EnVivo } from "@/components/en-vivo"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { cargarCuentas, cargarViajesEnCurso } from "@/lib/datos/admin"
import { exigirAdmin } from "@/lib/sesion"

export const metadata: Metadata = { title: "Viajes en curso · Administración · Línea Auxiliar" }

// Viajes en curso (§8): se abre desde el Resumen. Se actualiza sola (EnVivo).
export default async function PaginaViajes() {
  await exigirAdmin()
  const [{ choferes, error }, { cuentas }] = await Promise.all([cargarViajesEnCurso(), cargarCuentas()])
  // Conectados sin viaje abierto: también se pueden desconectar (R69)
  const conViaje = new Set(choferes.map((c) => c.id))
  const sinViaje = cuentas.filter((c) => c.rol === "chofer" && c.estado === "aprobado" && c.actividad?.conectado && !conViaje.has(c.id))

  return (
    <div className="flex flex-col gap-5">
      <EnVivo />
      <header className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-bold">Viajes en curso</h1>
        <p className="text-muted-foreground">Quién va en cada carro y por dónde va. Se actualiza sola.</p>
        <Link href="/admin/viajes/terminados" className="mt-1 w-fit font-bold text-primary underline underline-offset-4">
          Ver viajes terminados
        </Link>
      </header>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar los viajes: {error}</AlertTitle>
        </Alert>
      ) : (
        <ViajesEnCurso choferes={choferes} sinViaje={sinViaje} />
      )}
    </div>
  )
}
