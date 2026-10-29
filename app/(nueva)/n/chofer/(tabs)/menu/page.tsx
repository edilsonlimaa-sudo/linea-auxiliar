import { ChevronRight, History, IdCard, Wallet } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { AppHeader } from "@/components/nueva/app/app-header"
import { Screen } from "@/components/nueva/app/screen"
import { ChoferAvatar } from "@/components/nueva/pasajero/comunes"
import { CerrarSesionDrawer, OpinionAppDrawer, SugerenciaDrawer, TemaSelector } from "@/components/nueva/pasajero/menu"
import { firmarFotos } from "@/lib/fotos"
import { exigirCuentaAprobada } from "@/lib/sesion"
import { crearClienteServidor } from "@/lib/supabase/cliente-servidor"
import { iniciales } from "@/lib/viajes"

export const metadata: Metadata = { title: "Menú · Línea Auxiliar" }

// Menú del chofer en la interfaz nueva: su carnet y su carro, Mis viajes (R50), la cuota del día, sugerencias y opinión (R81–R82),
// apariencia y salir
export default async function MenuChofer() {
  const perfil = await exigirCuentaAprobada({ interfaz: "nueva-chofer" })
  const supabase = await crearClienteServidor()
  const [{ data: carro }, { count: terminados }, fotos] = await Promise.all([
    supabase.from("vehiculos").select("unidad, placa, modelo, color").eq("chofer_id", perfil.id).maybeSingle(),
    supabase.from("viajes").select("id", { count: "exact", head: true }).eq("chofer_id", perfil.id).eq("estado", "finalizado"),
    firmarFotos([perfil.foto_path]),
  ])
  const fotoUrl = perfil.foto_path ? (fotos.get(perfil.foto_path) ?? null) : null

  return (
    <Screen>
      <AppHeader title="Menú" />
      <div className="flex flex-col gap-6 p-4">
        <Link href="/n/chofer/carnet" transitionTypes={["nav-forward"]} className="flex items-center gap-4 rounded-3xl border bg-card p-4 transition-colors active:bg-muted">
          <ChoferAvatar chofer={{ nombre: perfil.nombre, iniciales: iniciales(perfil.nombre), fotoUrl }} className="size-14 text-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg font-semibold">{perfil.nombre}</p>
            {carro ? (
              <p className="truncate text-sm text-muted-foreground">
                {[carro.modelo, carro.color].filter(Boolean).join(" ") || "Carro"} · {carro.placa}
                {carro.unidad ? ` · Unidad ${carro.unidad}` : ""}
              </p>
            ) : null}
            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary">
              <IdCard className="size-3.5" /> Mi carnet y Pago Móvil
            </p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>

        <section className="divide-y overflow-hidden rounded-3xl border bg-card">
          <Fila href="/n/chofer/viajes" icono={<History className="size-5" />} titulo="Mis viajes"
            detalle={!terminados ? "Todavía no terminaste ningún viaje" : terminados === 1 ? "1 viaje terminado" : `${terminados} viajes terminados`} />
          <Fila href="/n/chofer/cuota" icono={<Wallet className="size-5" />} titulo="Cuota del día" detalle="Pagar y ver el estado de tu pago" />
        </section>

        <section className="divide-y overflow-hidden rounded-3xl border bg-card">
          <SugerenciaDrawer />
          <OpinionAppDrawer />
        </section>

        <section className="overflow-hidden rounded-3xl border bg-card">
          <TemaSelector />
        </section>

        <section className="overflow-hidden rounded-3xl border bg-card">
          <CerrarSesionDrawer />
        </section>

        <p className="text-center text-xs text-muted-foreground">Línea Auxiliar Valle Grande</p>
      </div>
    </Screen>
  )
}

function Fila({ href, icono, titulo, detalle }: { href: string; icono: React.ReactNode; titulo: string; detalle: string }) {
  return (
    <Link href={href} transitionTypes={["nav-forward"]} className="flex items-center gap-3 p-3 transition-colors active:bg-muted">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icono}</div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{titulo}</p>
        <p className="truncate text-sm text-muted-foreground">{detalle}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}
