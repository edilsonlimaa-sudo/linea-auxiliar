import { ChevronRightIcon, MessageCircleIcon, PhoneIcon, SnowflakeIcon } from "lucide-react"
import Link from "next/link"

import { DesconectarChofer } from "@/components/admin/acciones-viaje"
import { BotonDecision } from "@/components/admin/boton-decision"
import { Estrellas, promedioTexto } from "@/components/estrellas"
import { Avatar } from "@/components/foto/avatar"
import { ViajesChofer } from "@/components/historial/viajes-chofer"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { Badge } from "@/components/ui/badge"
import type { DetalleChofer, DetallePasajero, ReservaDelPasajero } from "@/lib/datos/personas-admin"
import { diaYHora, fechaHora, hace } from "@/lib/fechas"
import { formatearTelefono } from "@/lib/telefono"
import { SENTIDOS } from "@/lib/viajes"

type Cuenta = DetalleChofer["cuenta"]

/** Foto, nombre, contacto y datos de la cuenta: lo mismo arriba en los dos detalles */
function Cabecera({ cuenta: c, conectado }: { cuenta: Cuenta; conectado?: boolean }) {
  const digitos = c.telefono?.replace(/\D/g, "")
  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 bg-card p-4">
      <header className="flex items-center gap-4">
        <Avatar url={c.fotoUrl} nombre={c.nombre} className="size-20 text-xl" />
        <div className="min-w-0">
          <h1 className="text-xl leading-tight font-bold">{c.nombre}</h1>
          {conectado && (
            <p className="inline-flex items-center gap-1.5 font-bold text-success">
              <span aria-hidden className="size-2.5 rounded-full bg-success" /> Conectado ahora
            </p>
          )}
          {c.estado !== "aprobado" && <Badge variant={c.estado === "rechazado" ? "destructive" : "warning"}>{c.estado === "rechazado" ? "Rechazado" : "Pendiente"}</Badge>}
        </div>
      </header>
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
        <dt className="text-muted-foreground">Desde</dt>
        <dd title={fechaHora(c.creado_en)}>Se registró {hace(c.creado_en)}</dd>
      </dl>
      {digitos && (
        <div className="flex gap-2">
          <a
            href={`https://wa.me/${digitos}`}
            target="_blank"
            rel="noopener"
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-whatsapp px-3 font-bold text-whatsapp-foreground"
          >
            <MessageCircleIcon aria-hidden className="size-5" /> WhatsApp
          </a>
          <a href={`tel:+${digitos}`} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border-2 bg-card px-3 font-bold">
            <PhoneIcon aria-hidden className="size-5" /> Llamar
          </a>
        </div>
      )}
    </section>
  )
}

function Numeros({ datos }: { datos: { valor: React.ReactNode; texto: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {datos.map((d) => (
        <div key={d.texto} className="flex min-h-20 flex-col justify-between gap-2 rounded-2xl border-2 bg-card p-3">
          <span className="text-xl leading-none font-bold tabular-nums">{d.valor}</span>
          <span className="text-sm leading-tight text-muted-foreground">{d.texto}</span>
        </div>
      ))}
    </div>
  )
}

/** Quitarle el acceso, al final y aparte: se usa poco */
function Rechazar({ cuenta: c }: { cuenta: Cuenta }) {
  if (c.estado === "rechazado") return null
  return (
    <section className="flex flex-col gap-2 border-t-2 pt-4">
      <h2 className="font-bold">Quitarle el acceso</h2>
      <p className="text-sm text-muted-foreground">Al rechazar la cuenta ya no puede entrar a la app. Queda en Por aprobar → Rechazados.</p>
      <div className="flex sm:max-w-xs">
        <BotonDecision id={c.id} nombre={c.nombre} aprobar={false} />
      </div>
    </section>
  )
}

export function VistaChofer({ detalle: d }: { detalle: DetalleChofer }) {
  const c = d.cuenta
  const conectado = Boolean(c.actividad?.conectado)
  const estrellas = c.actividad?.estrellas != null && Number(c.actividad.calificaciones) > 0 ? Number(c.actividad.estrellas) : null
  return (
    <div className="flex flex-col gap-4">
      {/* En pantalla grande, lado a lado y con la misma altura: la foto del carro ocupa lo que sobra (no estira la tarjeta) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Cabecera cuenta={c} conectado={conectado} />
        <section className="flex flex-col gap-3 rounded-2xl border-2 bg-card p-4">
          <h2 className="font-bold">El carro</h2>
          {c.fotoCarroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- enlace firmado de Supabase Storage (R54)
            <img src={c.fotoCarroUrl} alt={`Carro de ${c.nombre}`} className="aspect-video w-full rounded-xl object-cover lg:aspect-auto lg:min-h-32 lg:grow lg:basis-0" />
          ) : (
            <p className="rounded-xl bg-warning-muted px-3 py-2 text-sm font-bold text-warning">Sin foto del carro</p>
          )}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-block rounded-md border-2 border-foreground px-2.5 py-0.5 font-mono text-base font-bold tracking-widest">{c.placa}</span>
            {c.unidad && <span className="font-bold">Unidad {c.unidad}</span>}
            <span>{[c.modelo, c.color].filter(Boolean).join(" · ")}</span>
            {c.aire_acondicionado && (
              <span className="inline-flex items-center gap-1">
                <SnowflakeIcon aria-hidden className="size-4" /> Aire
              </span>
            )}
          </p>
        </section>
      </div>

      {conectado && (
        <div className="flex flex-wrap gap-2">
          <VerEnMapa choferId={c.id} chofer={c.nombre} yo={null} admin className="flex-1" />
          <DesconectarChofer choferId={c.id} chofer={c.nombre} className="h-auto min-h-10" />
        </div>
      )}

      <Numeros
        datos={[
          { valor: d.terminados, texto: d.terminados === 1 ? "viaje terminado" : "viajes terminados" },
          { valor: d.cancelados, texto: d.cancelados === 1 ? "cancelado" : "cancelados" },
          { valor: d.llevados, texto: d.llevados === 1 ? "pasajero llevado" : "pasajeros llevados" },
          { valor: estrellas !== null ? `★ ${promedioTexto(estrellas)}` : "—", texto: Number(c.actividad?.calificaciones ?? 0) === 1 ? "1 calificación" : `${c.actividad?.calificaciones ?? 0} calificaciones` },
        ]}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold">Últimos viajes</h2>
        {d.viajes.length === 0 ? (
          <p className="text-muted-foreground">Todavía no tiene viajes cerrados.</p>
        ) : (
          <ViajesChofer viajes={d.viajes} admin />
        )}
        {d.terminados + d.cancelados > d.viajes.length && (
          <VerTodo href={`/admin/choferes/${c.id}/viajes`}>Ver todos sus viajes ({d.terminados + d.cancelados})</VerTodo>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold">Últimas calificaciones</h2>
        {d.calificaciones.length === 0 ? (
          <p className="text-muted-foreground">Todavía nadie lo calificó.</p>
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {d.calificaciones.map((c, i) => (
              <li key={i} className="flex flex-col gap-1 rounded-xl border-l-4 border-signal bg-muted px-3 py-2">
                <span className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {c.autor} <Estrellas valor={c.estrellas} tamano="size-4" />
                  <span className="font-normal text-muted-foreground">{hace(c.creadoEn)}</span>
                </span>
                {c.comentario ? <span>“{c.comentario}”</span> : <span className="text-sm text-muted-foreground">Sin comentario</span>}
              </li>
            ))}
          </ul>
        )}
        {Number(c.actividad?.calificaciones ?? 0) > d.calificaciones.length && (
          <VerTodo href={`/admin/choferes/${c.id}/calificaciones`}>Ver todas sus calificaciones ({c.actividad?.calificaciones})</VerTodo>
        )}
      </section>

      <Rechazar cuenta={c} />
    </div>
  )
}

/** "Ver todos sus viajes (32)": la lista completa, en su página dentro del detalle */
function VerTodo({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between gap-2 rounded-2xl border-2 bg-card px-4 font-bold text-primary outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
    >
      {children}
      <ChevronRightIcon aria-hidden className="size-5 shrink-0" />
    </Link>
  )
}

const RESERVA: Record<ReservaDelPasajero["estado"], { texto: string; variante: "success" | "secondary" | "destructive" | "warning" | "outline" }> = {
  activa: { texto: "En curso", variante: "outline" },
  subio: { texto: "Viajó", variante: "success" },
  bajo: { texto: "Se bajó antes", variante: "success" },
  no_llego: { texto: "No llegó", variante: "destructive" },
  cancelada: { texto: "Canceló", variante: "secondary" },
  sin_puesto: { texto: "Se quedó sin puesto", variante: "warning" },
  rechazada: { texto: "El chofer no pudo pasar", variante: "secondary" },
}

export function VistaPasajero({ detalle: d }: { detalle: DetallePasajero }) {
  const c = d.cuenta
  return (
    <div className="flex flex-col gap-4">
      <Cabecera cuenta={c} />

      <Numeros
        datos={[
          { valor: d.viajo, texto: d.viajo === 1 ? "viaje hecho" : "viajes hechos" },
          { valor: d.cancelo, texto: d.cancelo === 1 ? "reserva cancelada" : "reservas canceladas" },
          { valor: d.noLlego, texto: d.noLlego === 1 ? "vez que no llegó" : "veces que no llegó" },
          { valor: d.calificaciones, texto: d.calificaciones === 1 ? "calificación dada" : "calificaciones dadas" },
        ]}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold">Últimas reservas</h2>
        {d.reservas.length === 0 ? (
          <p className="text-muted-foreground">Todavía no apartó ningún puesto.</p>
        ) : (
          <ul className="grid gap-2 lg:grid-cols-2">
            {d.reservas.map((r) => {
              // "Viajó" solo si el viaje terminó; si va en ruta, está a bordo
              const estado = r.estado === "subio" && r.viajeEstado === "en_ruta" ? { texto: "A bordo", variante: "outline" as const } : RESERVA[r.estado]
              return (
                <li key={r.id} className="flex flex-col gap-1 rounded-2xl border-2 bg-card px-3 py-2.5">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold">{diaYHora(r.salida ?? r.creadoEn)}</span>
                    <Badge variant={estado.variante}>{estado.texto}</Badge>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {SENTIDOS[r.sentido].largo} · con {r.chofer}
                    {r.personas > 1 && ` · ${r.personas} personas`}
                    {r.lugar && ` · ${r.lugar}`}
                  </span>
                  {r.calificacion !== null && (
                    <span className="flex items-center gap-1.5 text-sm">
                      Calificó <Estrellas valor={r.calificacion} tamano="size-4" />
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {d.lista.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold">En la Lista hacia Valle Grande</h2>
          <ul className="grid gap-2 lg:grid-cols-2">
            {d.lista.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 rounded-2xl border-2 bg-card px-3 py-2.5">
                <span className="font-bold">{diaYHora(e.creadaEn)}</span>
                <span className="text-sm text-muted-foreground">
                  {e.enGina ? "En Gina" : (e.lugar ?? "En el camino")} · {e.detalle}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Rechazar cuenta={c} />
    </div>
  )
}
