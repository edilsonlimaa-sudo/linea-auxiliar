import { CheckCircle2Icon, ChevronRightIcon, StarIcon } from "lucide-react"
import Link from "next/link"

import { promedioTexto } from "@/components/estrellas"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import type { CuentaConActividad, Resumen as DatosResumen, RolCuenta } from "@/lib/datos/admin"
import { cn } from "@/lib/utils"

const ROL: Record<RolCuenta, { icono: string; uno: string; varios: string; href: string }> = {
  chofer: { icono: "🚐", uno: "chofer", varios: "choferes", href: "/admin/choferes" },
  pasajero: { icono: "🙋", uno: "pasajero", varios: "pasajeros", href: "/admin/pasajeros" },
}

/**
 * Resumen del panel (§8): primero lo que necesita del admin (por revisar), después cómo va la línea ahora,
 * hoy y la comunidad.
 */
export function Resumen({
  cuentas,
  resumen,
  pendientes,
}: {
  cuentas: CuentaConActividad[]
  resumen: DatosResumen | null
  pendientes: Record<RolCuenta, number>
}) {
  const conectados = cuentas.filter((c) => c.rol === "chofer" && c.estado === "aprobado" && c.actividad?.conectado)
  const aprobados = (rol: RolCuenta) => cuentas.filter((c) => c.rol === rol && c.estado === "aprobado").length
  const totalPendientes = pendientes.chofer + pendientes.pasajero

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Por revisar */}
      {totalPendientes > 0 ? (
        <section aria-labelledby="titulo-revisar" className="flex flex-col gap-3 rounded-3xl border-2 border-signal bg-signal/15 p-4">
          <h2 id="titulo-revisar" className="text-xl leading-tight font-bold">
            {totalPendientes === 1 ? "1 cuenta espera tu aprobación" : `${totalPendientes} cuentas esperan tu aprobación`}
          </h2>
          <ul className="flex flex-col gap-2">
            {(["chofer", "pasajero"] as const)
              .filter((rol) => pendientes[rol] > 0)
              .map((rol) => (
                <li key={rol}>
                  <Link
                    href={`${ROL[rol].href}?estado=pendiente`}
                    className="flex min-h-14 items-center gap-3 rounded-2xl bg-card px-4 font-bold hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span aria-hidden className="text-2xl">
                      {ROL[rol].icono}
                    </span>
                    <span className="flex-1 text-lg">
                      {pendientes[rol]} {pendientes[rol] === 1 ? ROL[rol].uno : ROL[rol].varios}
                    </span>
                    <span className="text-primary">Revisar</span>
                    <ChevronRightIcon aria-hidden className="size-5 text-primary" />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ) : (
        <p className="flex items-center gap-2.5 rounded-3xl border-2 bg-success-muted px-4 py-3 text-lg font-bold text-success">
          <CheckCircle2Icon aria-hidden className="size-6 shrink-0" />
          Todo al día: nadie espera aprobación
        </p>
      )}

      {/* 2. La línea ahora */}
      <Seccion titulo="La línea ahora">
        <div className="grid grid-cols-3 gap-2">
          <Dato valor={conectados.length} texto={conectados.length === 1 ? "chofer conectado" : "choferes conectados"} destacado={conectados.length > 0} />
          <Dato
            valor={resumen?.viajes_en_curso ?? 0}
            texto={resumen?.viajes_en_curso === 1 ? "viaje en curso" : "viajes en curso"}
            href="/admin/viajes"
          />
          <Dato
            valor={resumen?.pasajeros_esperando ?? 0}
            texto={resumen?.pasajeros_esperando === 1 ? "pasajero esperando" : "pasajeros esperando"}
            href="/admin/demanda"
          />
        </div>
        {conectados.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {conectados.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-muted px-3 py-2">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-success" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{c.nombre}</span>
                  {c.placa && <span className="block font-mono text-sm font-bold tracking-wider text-muted-foreground">{c.placa}</span>}
                </span>
                {/* El mapa sigue al chofer mientras comparte su ubicación (§8, R41) */}
                <VerEnMapa choferId={c.id} chofer={c.nombre} yo={null} admin className="shrink-0" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-muted-foreground">Ningún chofer trabajando en este momento.</p>
        )}
      </Seccion>

      {/* 3. Hoy */}
      <Seccion titulo="Hoy">
        <div className="grid grid-cols-3 gap-2">
          <Dato valor={resumen?.viajes_hoy ?? 0} texto={resumen?.viajes_hoy === 1 ? "viaje terminado" : "viajes terminados"} />
          <Dato valor={resumen?.pasajeros_hoy ?? 0} texto={resumen?.pasajeros_hoy === 1 ? "pasajero llevado" : "pasajeros llevados"} />
          <Dato
            valor={
              resumen?.estrellas_7d != null ? (
                <span className="inline-flex items-center gap-1">
                  <StarIcon aria-hidden className="size-6 fill-signal text-signal" />
                  {promedioTexto(Number(resumen.estrellas_7d))}
                </span>
              ) : (
                "—"
              )
            }
            texto={
              resumen?.calificaciones_7d
                ? `${resumen.calificaciones_7d} ${resumen.calificaciones_7d === 1 ? "calificación" : "calificaciones"} en 7 días`
                : "sin calificaciones en 7 días"
            }
          />
        </div>
      </Seccion>

      {/* 4. Comunidad */}
      <Seccion titulo="Comunidad">
        <div className="grid grid-cols-3 gap-2">
          <Dato valor={aprobados("chofer")} texto="choferes aprobados" href="/admin/choferes?estado=aprobado" />
          <Dato valor={aprobados("pasajero")} texto="pasajeros aprobados" href="/admin/pasajeros?estado=aprobado" />
          <Dato valor={resumen?.registros_7d ?? 0} texto={resumen?.registros_7d === 1 ? "registro en 7 días" : "registros en 7 días"} />
        </div>
      </Seccion>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const id = `titulo-${titulo.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4">
      <h2 id={id} className="text-lg font-bold">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Dato({ valor, texto, destacado, href }: { valor: React.ReactNode; texto: string; destacado?: boolean; href?: string }) {
  const contenido = (
    <>
      <span className={cn("text-[28px] leading-none font-bold tabular-nums", destacado && "text-success")}>{valor}</span>
      <span className="text-sm leading-tight text-muted-foreground">{texto}</span>
    </>
  )
  const clases = "flex min-h-24 flex-col justify-between gap-2 rounded-2xl bg-muted p-3"
  return href ? (
    <Link href={href} className={cn(clases, "hover:bg-muted/70 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none")}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  )
}
