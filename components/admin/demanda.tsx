import {
  CheckCircle2Icon,
  ClockIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { Avatar } from "@/components/foto/avatar"
import { buttonVariants } from "@/components/ui/button"
import type { DemandaHoy, Esperando, OfertaSentido } from "@/lib/datos/admin"
import { hace } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import { conAcompanantes, haciaEnFrase, SENTIDOS, sumaPersonas, type Sentido } from "@/lib/viajes"

const ORDEN: Sentido[] = ["vg_a_centro", "centro_a_vg"]
// Desde aquí la espera se marca en amarillo: alguien lleva mucho rato sin transporte
const ESPERA_LARGA_MIN = 20

/**
 * Demanda del panel (§8): por sentido, cuántos esperan contra los puestos libres; quién espera (primero quien
 * lleva más tiempo) con dónde y cómo contactarlo; y cómo se atendió hoy.
 */
export function Demanda({
  esperando,
  oferta,
  hoy,
}: {
  esperando: Esperando[]
  oferta: Record<Sentido, OfertaSentido>
  hoy: DemandaHoy | null
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* 1. Por sentido */}
      <div className="grid gap-3 sm:grid-cols-2">
        {ORDEN.map((s) => (
          <PorSentido
            key={s}
            sentido={s}
            esperan={sumaPersonas(esperando.filter((e) => e.sentido === s))}
            oferta={oferta[s]}
          />
        ))}
      </div>

      {/* 2. Quién espera */}
      {esperando.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-8 text-center text-muted-foreground">
          <CheckCircle2Icon aria-hidden className="size-5" />
          Nadie está esperando transporte ahora.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          {ORDEN.filter((s) => esperando.some((e) => e.sentido === s)).map(
            (s) => (
              <section
                key={s}
                aria-labelledby={`espera-${s}`}
                className="flex flex-col gap-3"
              >
                <h2 id={`espera-${s}`} className="text-xl font-bold">
                  Esperan {haciaEnFrase(s)}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({SENTIDOS[s].largo})
                  </span>
                </h2>
                <ul className="flex flex-col gap-3">
                  {esperando
                    .filter((e) => e.sentido === s)
                    .map((e) => (
                      <FilaEspera key={e.id} espera={e} />
                    ))}
                </ul>
              </section>
            )
          )}
        </div>
      )}

      {/* 3. Hoy */}
      {hoy && <Hoy hoy={hoy} />}
    </div>
  )
}

export function PorSentido({
  sentido,
  esperan,
  oferta,
}: {
  sentido: Sentido
  esperan: number
  oferta: OfertaSentido
}) {
  const falta = esperan > oferta.puestosLibres
  return (
    <section
      aria-label={SENTIDOS[sentido].largo}
      className={cn(
        "flex flex-col gap-2 rounded-3xl border-2 p-4",
        falta ? "border-warning bg-warning-muted" : "bg-card"
      )}
    >
      <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
        {SENTIDOS[sentido].largo}
      </p>
      <p className="text-[28px] leading-none font-bold tabular-nums">
        {esperan}{" "}
        <span className="text-lg font-bold">
          {esperan === 1 ? "espera" : "esperan"}
        </span>
      </p>
      <p className="text-[15px]">
        {oferta.unidades === 0
          ? "Ninguna unidad aceptando pasajeros"
          : `${oferta.unidades} ${oferta.unidades === 1 ? "unidad" : "unidades"} con ${oferta.puestosLibres} ${oferta.puestosLibres === 1 ? "puesto libre" : "puestos libres"}`}
      </p>
      {esperan > 0 && (
        <p
          className={cn(
            "flex items-center gap-1.5 font-bold",
            falta ? "text-warning" : "text-success"
          )}
        >
          {falta ? (
            <TriangleAlertIcon aria-hidden className="size-5" />
          ) : (
            <CheckCircle2Icon aria-hidden className="size-5" />
          )}
          {falta
            ? `Falta transporte para ${esperan - oferta.puestosLibres}`
            : "Cubierto"}
        </p>
      )}
    </section>
  )
}

function FilaEspera({ espera: e }: { espera: Esperando }) {
  const larga = e.minutos >= ESPERA_LARGA_MIN
  const digitos = e.telefono?.replace(/\D/g, "")
  return (
    <li className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
      <div className="flex items-center gap-3">
        <Avatar url={e.fotoUrl} nombre={e.nombre} className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg leading-tight font-bold">{conAcompanantes(e.nombre, e.personas)}</p>
          <p
            className={cn(
              "flex items-center gap-1.5 text-[15px]",
              larga ? "font-bold text-warning" : "text-muted-foreground"
            )}
          >
            <ClockIcon aria-hidden className="size-4" />
            Espera {hace(e.creado_en)}
          </p>
        </div>
      </div>
      <p className="flex items-start gap-1.5">
        <MapPinIcon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-primary"
        />
        <span className={e.lugar ? "font-bold" : "text-muted-foreground"}>
          {e.lugar ?? "Solo con GPS"}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {e.lat !== null && e.lng !== null && (
          // Abre el mapa del teléfono en el punto que compartió
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${e.lat},${e.lng}`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "flex-1",
            })}
          >
            <MapPinIcon aria-hidden /> Ver ubicación
          </a>
        )}
        {digitos && (
          <>
            <a
              href={`https://wa.me/${digitos}`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({
                variant: "whatsapp",
                size: "sm",
                className: "flex-1",
              })}
            >
              <MessageCircleIcon aria-hidden /> WhatsApp
            </a>
            <a
              href={`tel:+${digitos}`}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "flex-1",
              })}
            >
              <PhoneIcon aria-hidden /> Llamar
            </a>
          </>
        )}
      </div>
    </li>
  )
}

function Hoy({ hoy }: { hoy: DemandaHoy }) {
  const datos = [
    { valor: hoy.pedidos, texto: hoy.pedidos === 1 ? "pedido" : "pedidos" },
    {
      valor: hoy.consiguieron,
      texto: "consiguieron puesto",
      clase: "text-success",
    },
    {
      valor: hoy.sin_transporte,
      texto: "se fueron sin transporte",
      clase: hoy.sin_transporte > 0 ? "text-warning" : undefined,
    },
    {
      valor: hoy.cancelaron,
      texto: hoy.cancelaron === 1 ? "canceló" : "cancelaron",
    },
  ]
  return (
    <section
      aria-labelledby="demanda-hoy"
      className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4"
    >
      <h2 id="demanda-hoy" className="text-lg font-bold">
        Hoy
      </h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {datos.map((d) => (
          <div
            key={d.texto}
            className="flex flex-col gap-1 rounded-2xl bg-muted p-3"
          >
            <span
              className={cn(
                "text-[28px] leading-none font-bold tabular-nums",
                d.clase
              )}
            >
              {d.valor}
            </span>
            <span className="text-sm leading-tight text-muted-foreground">
              {d.texto}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[15px] text-muted-foreground">
        {hoy.espera_promedio_min !== null
          ? `Quien consiguió puesto esperó en promedio ${hoy.espera_promedio_min} min.`
          : "Todavía nadie consiguió puesto hoy."}
      </p>
    </section>
  )
}
