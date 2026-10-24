import { BusIcon, ChevronDownIcon, CoffeeIcon, HandIcon, MapPinIcon, MessageCircleIcon, PhoneIcon, StarIcon, TriangleAlertIcon } from "lucide-react"
import Link from "next/link"

import { CerrarViaje, DesconectarChofer } from "@/components/admin/acciones-viaje"
import { LineaDeTiempo } from "@/components/admin/linea-de-tiempo"
import { promedioTexto } from "@/components/estrellas"
import { Avatar } from "@/components/foto/avatar"
import { Asientos } from "@/components/pasajero/asientos"
import { VerEnMapa } from "@/components/pasajero/ver-en-mapa"
import { buttonVariants } from "@/components/ui/button"
import type { ChoferEnCurso, CuentaConActividad, PausaAbierta, PersonaEnViaje, ViajeEnCurso } from "@/lib/datos/admin"
import { hora, textoVuelta } from "@/lib/fechas"
import { cn } from "@/lib/utils"
import {
  ABIERTOS,
  aceptaReservas,
  conAcompanantes,
  duracion,
  enEspera,
  ETIQUETA_ESTADO,
  type EstadoViaje,
  libres,
  llegada,
  minutosPara,
  type Sentido,
  SENTIDOS,
  type Viaje,
} from "@/lib/viajes"

const MIN = 60_000
const ORDEN_SENTIDOS: Sentido[] = ["vg_a_centro", "centro_a_vg"]
// Lo que pasa ahora primero; lo que ya salió al final
const ETAPA: Partial<Record<EstadoViaje, number>> = { en_parada: 0, llegando: 1, en_camino: 2, programado: 3, en_ruta: 4 }
// Avisos (§8, Viajes en curso)
const TOLERANCIA_MIN = 3 // pasó su hora (R56)
const RECOGIENDO_MUCHO_MIN = 15
const EN_RUTA_MUCHO_MIN = 60

type ViajeConChofer = { viaje: ViajeEnCurso; chofer: ChoferEnCurso }

const minDesde = (iso: string | null, ahora: number) => (iso ? Math.max(0, Math.round((ahora - new Date(iso).getTime()) / MIN)) : 0)

/** Lo que pide atención en un viaje, o null */
function avisoDe(v: ViajeEnCurso, ahora: number): string | null {
  if (v.personas.some((p) => p.estado === "activa" && p.pendiente)) return "Pedido en el camino sin responder"
  if (v.estado === "en_parada") {
    const m = minDesde(v.estado_en, ahora)
    if (m >= RECOGIENDO_MUCHO_MIN) return `Recogiendo hace ${duracion(m)}`
  }
  if (v.estado === "en_camino") {
    // eta_min ya incluye "Me atraso" (R70): se compara contra la última hora que dio
    const tarde = Math.round((ahora - (new Date(v.estado_en).getTime() + v.eta_min * MIN)) / MIN)
    if (tarde > TOLERANCIA_MIN)
      return v.atraso_en ? `Pasó la hora nueva que dio hace ${duracion(tarde)}` : `Pasó su hora hace ${duracion(tarde)} y no avisó`
  }
  if (v.estado === "en_ruta") {
    const m = minDesde(v.salida_en, ahora)
    if (m > EN_RUTA_MUCHO_MIN) return `En ruta hace ${duracion(m)}: ¿olvidó terminar?`
  }
  return null
}

/**
 * Viajes en curso del panel (§8): mira los viajes, no los choferes. Una columna por sentido con su oferta arriba;
 * dentro, por el momento del viaje (recogiendo → llegando → en camino → próximos → en ruta) y lo que pide atención
 * arriba. Cada viaje es una tarjeta corta; su gente y su línea de tiempo, plegadas. Al final, los conectados sin
 * viaje y quién está en pausa. El admin no cambia listas, pero puede cerrar un viaje o desconectar (R69).
 */
export function ViajesEnCurso({
  choferes,
  sinViaje = [],
  enPausa = [],
  enListaGina = 0,
  estrellas = new Map(),
  ahora,
}: {
  choferes: ChoferEnCurso[]
  sinViaje?: CuentaConActividad[]
  enPausa?: PausaAbierta[]
  enListaGina?: number // personas en la lista hacia Valle Grande
  estrellas?: Map<string, number | null>
  ahora: number
}) {
  const todos: ViajeConChofer[] = choferes.flatMap((c) => c.viajes.map((viaje) => ({ viaje, chofer: c })))
  const porId = new Map<string, Viaje>(todos.map(({ viaje }) => [viaje.id, viaje]))

  return (
    <div className="flex flex-col gap-6">
      {todos.length === 0 ? (
        <SinViajes />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {ORDEN_SENTIDOS.map((s) => (
            <ColumnaSentido
              key={s}
              sentido={s}
              viajes={todos.filter(({ viaje }) => viaje.sentido === s)}
              porId={porId}
              enListaGina={s === "centro_a_vg" ? enListaGina : null}
              estrellas={estrellas}
              ahora={ahora}
            />
          ))}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <ConectadosSinViaje choferes={sinViaje} />
        <EnPausa pausas={enPausa} ahora={ahora} />
      </div>
    </div>
  )
}

function ColumnaSentido({
  sentido,
  viajes,
  porId,
  enListaGina,
  estrellas,
  ahora,
}: {
  sentido: Sentido
  viajes: ViajeConChofer[]
  porId: Map<string, Viaje>
  enListaGina: number | null
  estrellas: Map<string, number | null>
  ahora: number
}) {
  const conAviso = new Map(viajes.map(({ viaje }) => [viaje.id, avisoDe(viaje, ahora)]))
  // Dentro de cada etapa: recogiendo, el que lleva más; por recoger, el que recoge antes; en ruta, el que salió antes
  const clave = (v: ViajeEnCurso) =>
    v.estado === "en_parada" ? new Date(v.estado_en).getTime() : v.estado === "en_ruta" ? new Date(v.salida_en ?? v.estado_en).getTime() : minutosPara(v, porId, ahora)
  const ordenados = [...viajes].sort(
    (a, b) =>
      Number(Boolean(conAviso.get(b.viaje.id))) - Number(Boolean(conAviso.get(a.viaje.id))) ||
      (ETAPA[a.viaje.estado] ?? 9) - (ETAPA[b.viaje.estado] ?? 9) ||
      clave(a.viaje) - clave(b.viaje)
  )

  // La oferta del sentido: viajes, puestos libres y cuándo recoge el próximo
  const abiertos = viajes.filter(({ viaje }) => ABIERTOS.includes(viaje.estado))
  const puestosLibres = viajes.filter(({ viaje }) => aceptaReservas(viaje)).reduce((n, { viaje }) => n + libres(viaje), 0)
  const recogiendo = abiertos.some(({ viaje }) => viaje.estado === "en_parada")
  const proximo = abiertos
    .filter(({ viaje }) => viaje.estado !== "en_parada")
    .map(({ viaje }) => minutosPara(viaje, porId, ahora))
    .sort((a, b) => a - b)[0]
  const id = `columna-${sentido}`

  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <header className="flex flex-col gap-1 rounded-2xl bg-muted px-4 py-3">
        <h2 id={id} className="text-base font-bold">
          → {SENTIDOS[sentido].hacia.replace(/^h/, "H")}
        </h2>
        <p className="text-sm">
          {viajes.length === 1 ? "1 viaje" : `${viajes.length} viajes`} · {puestosLibres === 1 ? "1 puesto libre" : `${puestosLibres} puestos libres`}
          {recogiendo
            ? ` · recogiendo ahora ${SENTIDOS[sentido].enRecogida}`
            : proximo !== undefined && proximo < 1
              ? " · el próximo ya pasó su hora"
              : proximo !== undefined
              ? ` · el próximo recoge a las ${hora(new Date(ahora + proximo * MIN).toISOString())}`
              : " · nadie va a recoger"}
        </p>
        {enListaGina !== null && (
          <p className={cn("text-sm font-bold", enListaGina > puestosLibres ? "text-warning" : "text-muted-foreground")}>
            {enListaGina === 1 ? "1 persona" : `${enListaGina} personas`} en la lista de Gina
          </p>
        )}
      </header>
      {ordenados.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed px-4 py-6 text-center text-muted-foreground">Ningún viaje en este sentido.</p>
      ) : (
        ordenados.map(({ viaje, chofer }) => (
          <TarjetaViaje
            key={viaje.id}
            viaje={viaje}
            chofer={chofer}
            porId={porId}
            aviso={conAviso.get(viaje.id) ?? null}
            estrellas={estrellas.get(chofer.id) ?? null}
            ahora={ahora}
          />
        ))
      )}
    </section>
  )
}

/** El tiempo que importa: cuándo recoge (y qué prometió) o hace cuánto salió */
function tiempoDe(v: ViajeEnCurso, porId: Map<string, Viaje>, ahora: number): { principal: string; detalle?: string } {
  const { enRecogida, hacia } = SENTIDOS[v.sentido]
  if (v.estado === "en_parada") return { principal: `Recogiendo ${enRecogida} desde las ${hora(v.estado_en)} (hace ${duracion(minDesde(v.estado_en, ahora))})` }
  if (v.estado === "en_ruta") {
    return { principal: `En ruta ${hacia}`, detalle: v.salida_en ? `Salió a las ${hora(v.salida_en)} · hace ${duracion(minDesde(v.salida_en, ahora))}` : undefined }
  }
  const cuando = llegada(v, porId, ahora)
  // En camino: cuándo salió a recoger y qué prometió (la puntualidad sigue contra lo primero, R56)
  const salio = v.eventos.find((e) => e.estado === "en_camino" && !e.atraso)
  if ((v.estado === "en_camino" || v.estado === "llegando") && salio?.etaMin != null) {
    const prometio = hora(new Date(new Date(salio.en).getTime() + salio.etaMin * MIN).toISOString())
    return { principal: cuando.principal, detalle: `Salió a recoger ${hora(salio.en)} · prometió ${prometio}${v.atraso_en ? " · avisó que se atrasa" : ""}` }
  }
  return cuando
}

function TarjetaViaje({
  viaje: v,
  chofer: c,
  porId,
  aviso,
  estrellas,
  ahora,
}: {
  viaje: ViajeEnCurso
  chofer: ChoferEnCurso
  porId: Map<string, Viaje>
  aviso: string | null
  estrellas: number | null
  ahora: number
}) {
  const { principal, detalle } = tiempoDe(v, porId, ahora)
  const ocupados = Math.min(v.ocupados, v.puestos)
  const n = libres(v)
  const espera = enEspera(v)
  const gente = v.personas.reduce((s, p) => s + p.personas, 0)
  const aBordo = v.personas.filter((p) => p.estado === "subio")
  const pedidos = v.personas.filter((p) => p.estado === "activa" && p.pendiente)
  const porRecoger = v.personas.filter((p) => p.estado === "activa" && !p.pendiente && p.confirmado)
  const enLista = v.personas.filter((p) => p.estado === "activa" && !p.pendiente && !p.confirmado)

  return (
    <article
      aria-label={`${SENTIDOS[v.sentido].largo}: ${ETIQUETA_ESTADO[v.estado]}, ${c.nombre}`}
      className={cn("flex flex-col gap-3 rounded-2xl border-2 bg-card p-4", aviso && "border-warning")}
    >
      {aviso && (
        <p role="status" className="-mx-1 -mt-1 flex items-start gap-2 rounded-xl bg-warning-muted px-3 py-2 text-sm font-bold">
          <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          {aviso}
        </p>
      )}

      {/* 1. Estado y el tiempo que importa */}
      <div className="flex flex-col gap-1">
        <p className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-sm font-bold",
              v.estado === "programado" ? "bg-muted text-muted-foreground" : v.estado === "en_parada" ? "bg-success-muted text-success" : "bg-primary text-primary-foreground"
            )}
          >
            {ETIQUETA_ESTADO[v.estado]}
          </span>
          <span className="text-sm font-bold tracking-wide text-muted-foreground uppercase">{SENTIDOS[v.sentido].largo}</span>
        </p>
        <p className="text-base leading-tight font-bold">{principal}</p>
        {detalle && <p className="text-sm text-muted-foreground">{detalle}</p>}
      </div>

      {/* 2. Puestos */}
      <p className="flex flex-wrap items-center gap-x-2 text-sm">
        <Asientos puestos={v.puestos} ocupados={ocupados} />
        <span className="font-bold">
          {ocupados} de {v.puestos}
        </span>
        {n > 0 ? <span className="text-success">· {n === 1 ? "1 libre" : `${n} libres`}</span> : <span className="text-muted-foreground">· lleno</span>}
        {espera > 0 && <span className="text-muted-foreground">· {espera} en lista de espera</span>}
      </p>

      {/* 3. Quién maneja, en una línea: abre su detalle */}
      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Link
          href={`/admin/choferes/${c.id}`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <Avatar url={c.fotoUrl} nombre={c.nombre} className="size-9 text-sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-bold">
              <span aria-hidden className={cn("size-2 shrink-0 rounded-full", c.conectado ? "bg-success" : "bg-muted-foreground")} />
              <span className="truncate">{c.nombre}</span>
            </span>
            <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {c.placa && <span className="font-mono font-bold tracking-wider text-foreground">{c.placa}</span>}
              {estrellas !== null && (
                <span className="inline-flex items-center gap-0.5">
                  <StarIcon aria-hidden className="size-3.5 fill-signal text-signal" />
                  {promedioTexto(estrellas)}
                </span>
              )}
            </span>
          </span>
        </Link>
        {c.conectado && <VerEnMapa choferId={c.id} chofer={c.nombre} yo={null} admin compacto />}
        <Contacto telefono={c.telefono} />
      </div>

      {/* 4. La gente y el cronómetro, a un toque */}
      {gente > 0 ? (
        <details className="group rounded-xl bg-muted">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 font-bold focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            Ver pasajeros ({gente})
            <ChevronDownIcon aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 px-3 pb-3">
            <Grupo titulo="A bordo" personas={aBordo} />
            <Grupo titulo="Pedidos en el camino" personas={pedidos} destacado />
            <Grupo titulo={v.estado === "en_ruta" ? "Va a recoger en el camino" : "Por recoger"} personas={porRecoger} />
            <Grupo titulo="Lista de espera" personas={enLista} />
          </div>
        </details>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía nadie en este viaje.</p>
      )}
      <LineaDeTiempo eventos={v.eventos} />

      <CerrarViaje viajeId={v.id} chofer={c.nombre} enRuta={v.estado === "en_ruta"} haciaValle={v.sentido === "centro_a_vg"} />
    </article>
  )
}

/** Conectados sin viaje abierto (R69): por si alguno quedó conectado sin trabajar y hay que desconectarlo */
function ConectadosSinViaje({ choferes }: { choferes: CuentaConActividad[] }) {
  if (choferes.length === 0) return null
  return (
    <section aria-labelledby="titulo-sin-viaje" className="flex flex-col gap-2">
      <h2 id="titulo-sin-viaje" className="text-base font-bold">
        Conectados sin viaje <span className="font-normal text-muted-foreground">({choferes.length})</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {choferes.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-card px-3 py-2.5">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-success" />
            <Link href={`/admin/choferes/${c.id}`} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate font-bold">{c.nombre}</span>
              {c.placa && <span className="font-mono text-sm font-bold tracking-wider text-muted-foreground">{c.placa}</span>}
            </Link>
            <DesconectarChofer choferId={c.id} chofer={c.nombre} viajesAbiertos={0} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** En pausa (R60): quién dijo que vuelve y a qué hora (en amarillo si ya pasó) y quién terminó por hoy */
function EnPausa({ pausas, ahora }: { pausas: PausaAbierta[]; ahora: number }) {
  if (pausas.length === 0) return null
  return (
    <section aria-labelledby="titulo-en-pausa" className="flex flex-col gap-2">
      <h2 id="titulo-en-pausa" className="text-base font-bold">
        En pausa <span className="font-normal text-muted-foreground">({pausas.length})</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {pausas.map((p) => {
          const tarde = p.vuelveEn ? Math.round((ahora - new Date(p.vuelveEn).getTime()) / MIN) : null
          const vencida = tarde !== null && tarde > TOLERANCIA_MIN
          return (
            <li key={p.choferId} className={cn("flex items-center gap-3 rounded-2xl border-2 bg-card px-3 py-2.5", vencida && "border-warning")}>
              <Avatar url={p.fotoUrl} nombre={p.nombre} className="size-9 text-sm" />
              <Link href={`/admin/choferes/${p.choferId}`} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate font-bold">{p.nombre}</span>
                <span className={cn("flex items-center gap-1 text-sm", vencida ? "font-bold text-warning" : "text-muted-foreground")}>
                  <CoffeeIcon aria-hidden className="size-4 shrink-0" />
                  {p.vuelveEn === null
                    ? "Terminó por hoy"
                    : vencida
                      ? `Dijo que volvía a las ${hora(p.vuelveEn)} · pasó hace ${duracion(tarde ?? 0)}`
                      : textoVuelta(p.vuelveEn, new Date(ahora)).replace(/^v/, "V")}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function SinViajes() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-10 text-center">
      <BusIcon aria-hidden className="size-10 text-muted-foreground" />
      <p className="text-base font-bold">No hay viajes en curso ahora</p>
      <p className="text-muted-foreground">Cuando un chofer publique un viaje, aparece aquí.</p>
    </div>
  )
}

function Grupo({ titulo, personas, destacado }: { titulo: string; personas: PersonaEnViaje[]; destacado?: boolean }) {
  if (personas.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h3 className={cn("font-bold", destacado && "text-destructive")}>
        {titulo} <span className="font-normal text-muted-foreground">({personas.length})</span>
      </h3>
      <ul className="flex flex-col gap-2">
        {personas.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 rounded-xl bg-card px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Avatar url={p.fotoUrl} nombre={p.nombre} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold">{conAcompanantes(p.nombre, p.personas)}</span>
                  {!p.conApp && <span className="rounded-full bg-muted px-2 py-0.5 text-sm">Sin app</span>}
                  {p.listo && p.estado === "activa" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-muted px-2 py-0.5 text-sm font-bold text-success">
                      <HandIcon aria-hidden className="size-4" /> Ya está en el sitio
                    </span>
                  )}
                </p>
                {(p.lugar || p.lat !== null) && (
                  <p className="flex items-start gap-1 text-sm">
                    <MapPinIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {p.lugar ?? "Solo compartió su GPS"}
                  </p>
                )}
              </div>
            </div>
            <Contacto telefono={p.telefono} gps={p.lat !== null && p.lng !== null ? `${p.lat},${p.lng}` : null} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function Contacto({ telefono, gps }: { telefono: string | null; gps?: string | null }) {
  const digitos = telefono?.replace(/\D/g, "")
  if (!digitos && !gps) return null
  return (
    <div className="flex flex-wrap gap-2">
      {gps && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${gps}`}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <MapPinIcon aria-hidden /> Ubicación
        </a>
      )}
      {digitos && (
        <>
          <a href={`https://wa.me/${digitos}`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "whatsapp", size: "sm" })}>
            <MessageCircleIcon aria-hidden /> WhatsApp
          </a>
          <a href={`tel:+${digitos}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <PhoneIcon aria-hidden /> Llamar
          </a>
        </>
      )}
    </div>
  )
}
