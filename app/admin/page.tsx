import { CheckCircle2Icon, KeyRoundIcon, LogOutIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { TarjetaCuenta } from "@/components/admin/tarjeta-cuenta"
import { firmarFotos } from "@/lib/fotos"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { salirAdmin } from "@/lib/acciones/admin"
import { exigirAdmin } from "@/lib/sesion"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Administración · Línea Auxiliar" }

const PESTANAS = [
  { estado: "pendiente", titulo: "Pendientes" },
  { estado: "aprobado", titulo: "Aprobados" },
  { estado: "rechazado", titulo: "Rechazados" },
] as const

type EstadoCuenta = (typeof PESTANAS)[number]["estado"]

const VACIO: Record<EstadoCuenta, string> = {
  pendiente: "No hay cuentas esperando aprobación 🎉",
  aprobado: "Todavía no hay cuentas aprobadas.",
  rechazado: "No hay cuentas rechazadas.",
}

export default async function PanelAdmin({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; clave?: string }>
}) {
  await exigirAdmin()
  const params = await searchParams
  const estado: EstadoCuenta = PESTANAS.some((p) => p.estado === params.estado)
    ? (params.estado as EstadoCuenta)
    : "pendiente"

  const supabase = await crearClienteServidor()
  const { data: cuentas, error } = await supabase.rpc("admin_cuentas")
  const todas = cuentas ?? []
  const lista = todas.filter((c) => c.estado === estado)
  const cuantas = (e: EstadoCuenta) => todas.filter((c) => c.estado === e).length
  // Fotos de perfil y del carro para verificar a la persona (R54)
  const fotos = await firmarFotos(lista.flatMap((c) => [c.foto_path, c.foto_carro_path]))

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-tight font-bold">Panel de administración</h1>
        <p className="text-muted-foreground">Revisa los datos de cada persona antes de aprobarla.</p>
      </header>

      {params.clave === "cambiada" && (
        <Alert variant="success">
          <CheckCircle2Icon aria-hidden />
          <AlertTitle>Contraseña cambiada</AlertTitle>
        </Alert>
      )}

      <nav aria-label="Estado de las cuentas" className="grid grid-cols-3 gap-1 rounded-2xl border-2 bg-card p-1">
        {PESTANAS.map((p) => {
          const activa = p.estado === estado
          return (
            <Link
              key={p.estado}
              href={`/admin?estado=${p.estado}`}
              aria-current={activa ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-center text-[15px] leading-tight font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                activa ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {p.titulo}
              <span className={cn("text-sm", activa ? "opacity-90" : "")}>({cuantas(p.estado)})</span>
            </Link>
          )
        })}
      </nav>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar las cuentas: {error.message}</AlertTitle>
        </Alert>
      ) : lista.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-muted-foreground">{VACIO[estado]}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((c) => (
            <TarjetaCuenta
              key={c.id}
              cuenta={c}
              fotoUrl={c.foto_path ? (fotos.get(c.foto_path) ?? null) : null}
              fotoCarroUrl={c.foto_carro_path ? (fotos.get(c.foto_carro_path) ?? null) : null}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t-2 pt-5">
        <Button render={<Link href="/admin/clave" />} nativeButton={false} variant="outline">
          <KeyRoundIcon aria-hidden /> Cambiar mi contraseña
        </Button>
        <form action={salirAdmin}>
          <Button type="submit" variant="outline" className="w-full">
            <LogOutIcon aria-hidden /> Salir del panel
          </Button>
        </form>
      </div>
    </div>
  )
}
