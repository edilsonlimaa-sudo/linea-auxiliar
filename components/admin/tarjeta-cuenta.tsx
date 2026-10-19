import { MessageCircleIcon, PhoneIcon, TriangleAlertIcon } from "lucide-react"

import { BotonDecision } from "@/components/admin/boton-decision"
import { Avatar } from "@/components/foto/avatar"
import type { Database } from "@/lib/database.types"
import { fechaHora, hace } from "@/lib/fechas"
import { formatearTelefono } from "@/lib/telefono"

export type Cuenta = Database["public"]["Functions"]["admin_cuentas"]["Returns"][number]

const ROL = { pasajero: "🙋 Pasajero", chofer: "🚐 Chofer", admin: "Administración" } as const

// Tarjeta de una cuenta en el panel: datos para verificar identidad (R2, R5) y acciones
export function TarjetaCuenta({
  cuenta: c,
  fotoUrl,
  fotoCarroUrl,
}: {
  cuenta: Cuenta
  fotoUrl: string | null
  fotoCarroUrl: string | null
}) {
  const chofer = c.rol === "chofer"
  const faltan = [!c.foto_path && "foto de perfil", chofer && !c.foto_carro_path && "foto del carro"].filter(Boolean)
  const digitos = c.telefono?.replace(/\D/g, "")

  return (
    <article className="flex flex-col gap-4 rounded-2xl border-2 bg-card p-4">
      <header className="flex items-center gap-4">
        {/* Foto grande: es lo que el admin compara para verificar a la persona (R54) */}
        <Avatar url={fotoUrl} nombre={c.nombre} className="size-20 text-2xl" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted-foreground">{ROL[c.rol]}</p>
          <h3 className="text-xl leading-tight font-bold">{c.nombre}</h3>
          <p className="text-[15px] text-muted-foreground" title={fechaHora(c.creado_en)}>
            Se registró {hace(c.creado_en)}
          </p>
        </div>
      </header>

      {chofer && fotoCarroUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- enlace firmado de Supabase Storage (R54)
        <img src={fotoCarroUrl} alt={`Carro de ${c.nombre}`} className="aspect-video w-full rounded-xl object-cover" />
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted-foreground">Teléfono</dt>
        <dd className="font-bold">{c.telefono ? formatearTelefono(c.telefono) : "—"}</dd>
        <dt className="text-muted-foreground">Cédula</dt>
        <dd className={c.cedula ? "font-bold" : "text-muted-foreground"}>{c.cedula ?? "No la indicó"}</dd>
        {c.urbanismo && (
          <>
            <dt className="text-muted-foreground">Vive en</dt>
            <dd className="font-bold">{c.urbanismo}</dd>
          </>
        )}
        {chofer && (
          <>
            <dt className="text-muted-foreground">Placa</dt>
            <dd>
              <span className="inline-block rounded-md border-2 border-foreground px-2.5 py-0.5 font-mono text-lg font-bold tracking-widest">
                {c.placa}
              </span>
            </dd>
            <dt className="text-muted-foreground">Unidad</dt>
            <dd className="font-bold">{c.unidad ?? "—"}</dd>
            <dt className="text-muted-foreground">Carro</dt>
            <dd className="font-bold">{[c.modelo, c.color].filter(Boolean).join(" · ") || "—"}</dd>
            <dt className="text-muted-foreground">Aire</dt>
            <dd className="font-bold">{c.aire_acondicionado ? "Sí" : "No"}</dd>
          </>
        )}
      </dl>

      {faltan.length > 0 && (
        <p className="flex items-center gap-2 rounded-md bg-warning-muted px-3 py-2 text-[15px] font-bold text-warning">
          <TriangleAlertIcon aria-hidden className="size-5 shrink-0" /> Falta {faltan.join(" y ")}
        </p>
      )}

      {digitos && (
        <div className="flex gap-2">
          <a
            href={`https://wa.me/${digitos}`}
            target="_blank"
            rel="noopener"
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-whatsapp px-3 font-bold text-whatsapp-foreground"
          >
            <MessageCircleIcon aria-hidden className="size-5" /> WhatsApp
          </a>
          <a
            href={`tel:+${digitos}`}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border-2 bg-card px-3 font-bold"
          >
            <PhoneIcon aria-hidden className="size-5" /> Llamar
          </a>
        </div>
      )}

      <div className="flex gap-2 border-t-2 pt-4">
        {c.estado !== "aprobado" && <BotonDecision id={c.id} nombre={c.nombre} aprobar />}
        {c.estado !== "rechazado" && <BotonDecision id={c.id} nombre={c.nombre} aprobar={false} />}
      </div>
    </article>
  )
}
